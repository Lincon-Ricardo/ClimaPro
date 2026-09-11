import { asaasRequest, getBillingPlan, type AsaasCustomer, type AsaasPayment, type AsaasSubscription } from '../_lib/asaas.js';
import { getAdminClient, getBearerToken } from '../_lib/supabase.js';
import { rateLimit, clientKey } from '../_lib/rateLimit.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  if (!rateLimit(clientKey(request, ':checkout'), 10, 60_000)) {
    return response.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto.' });
  }

  try {
    const token = getBearerToken(request);
    if (!token) return response.status(401).json({ error: 'Sessão ausente.' });

    const supabase = getAdminClient();
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return response.status(401).json({ error: 'Sessão inválida.' });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, company_id, role, name, email')
      .eq('id', auth.user.id)
      .single();
    if (profileError || !profile || profile.role !== 'admin') {
      return response.status(403).json({ error: 'Somente administradores podem assinar um plano.' });
    }

    const body = request.body || {};
    const billing = getBillingPlan(body.planKey, body.cycle);
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, email, phone, cnpj')
      .eq('id', profile.company_id)
      .single();
    if (companyError || !company) throw new Error('Empresa não encontrada.');

    let customerId = '';
    const { data: current } = await supabase
      .from('subscriptions')
      .select('asaas_customer_id, asaas_subscription_id, status, plan, billing_cycle')
      .eq('company_id', profile.company_id)
      .maybeSingle() as { data: { asaas_customer_id?: string | null; asaas_subscription_id?: string | null; status?: string | null; plan?: string | null; billing_cycle?: string | null } | null };
    if (current?.plan === 'lifetime' || current?.status === 'lifetime') {
      return response.status(409).json({ error: 'Você já é Pioneiro Vitalício. Nenhuma cobrança nova é necessária.' });
    }
    const samePlan = current?.asaas_subscription_id && current.plan === billing.planKey && current.billing_cycle === billing.cycle && ['active', 'past_due'].includes(current.status || '');
    if (samePlan) {
      return response.status(409).json({ error: 'Sua empresa já está neste plano. Para trocar, escolha outro plano ou ciclo.' });
    }
    if (current?.asaas_subscription_id && ['active', 'past_due'].includes(current.status)) {
      try {
        await asaasRequest(`/subscriptions/${current.asaas_subscription_id}`, { method: 'DELETE' });
      } catch { /* segue e cria a nova mesmo se a antiga já estiver inativa no Asaas */ }
    }
    customerId = current?.asaas_customer_id || '';

    if (!customerId) {
      const doc = String(company.cnpj || '').replace(/\D/g, '');
      if (doc && doc.length !== 11 && doc.length !== 14) {
        return response.status(400).json({ error: 'CPF/CNPJ da empresa inválido. Corrija em Empresa antes de assinar.' });
      }
      const email = company.email || profile.email || auth.user.email || '';
      const base = {
        name: company.name,
        email,
        phone: company.phone || undefined,
        externalReference: profile.company_id,
      };
      const findExisting = async (): Promise<string> => {
        const queries = [
          ...(doc ? [`/customers?cpfCnpj=${doc}`] : []),
          ...(email ? [`/customers?email=${encodeURIComponent(email)}`] : []),
        ];
        for (const q of queries) {
          try {
            const found = await asaasRequest<{ data?: { id: string }[] }>(q, { method: 'GET' });
            if (found.data?.[0]?.id) return found.data[0].id;
          } catch { /* ignora e tenta proxima */ }
        }
        return '';
      };
      customerId = await findExisting();
      if (!customerId) {
        try {
          const customer = await asaasRequest<AsaasCustomer>('/customers', {
            method: 'POST',
            body: JSON.stringify(doc ? { ...base, cpfCnpj: doc } : base),
          });
          customerId = customer.id;
        } catch (e: unknown) {
          customerId = await findExisting();
          if (!customerId) {
            if (doc) {
              try {
                const retry = await asaasRequest<AsaasCustomer>('/customers', {
                  method: 'POST',
                  body: JSON.stringify(base),
                });
                customerId = retry.id;
              } catch {
                customerId = await findExisting();
              }
            }
            if (!customerId) throw e;
          }
        }
      }
    }

    const nextDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const method = String((body as { method?: string })?.method || 'card').toLowerCase();
    const billingType = method === 'pix' ? 'PIX' : method === 'boleto' ? 'BOLETO' : 'CREDIT_CARD';
    const lifetime = (billing as { lifetime?: boolean }).lifetime === true;
    if (lifetime) {
      const payment = await asaasRequest<{ id: string; invoiceUrl?: string; bankSlipUrl?: string; paymentLink?: string; pixQrCode?: string }>(
        '/payments',
        {
          method: 'POST',
          body: JSON.stringify({
            customer: customerId,
            billingType,
            value: billing.value,
            dueDate: nextDueDate,
            description: `ClimaPro ${billing.label} - pagamento único vitalício`,
            externalReference: `${profile.company_id}:lifetime`,
          }),
        },
      );
      let qr: string | null = null;
      let code: string | null = null;
      const checkoutUrl = payment.invoiceUrl || payment.bankSlipUrl || payment.paymentLink || null;
      if (billingType === 'PIX') {
        try {
          const pix = await asaasRequest<{ encodedImage?: string; payload?: string }>(`/payments/${payment.id}/pixQrCode`, { method: 'GET' });
          qr = pix.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : null;
          code = pix.payload || null;
        } catch { /* segue sem QR */ }
      }
      await supabase.from('subscriptions').upsert({
        company_id: profile.company_id,
        plan: 'lifetime',
        status: 'past_due',
        asaas_customer_id: customerId,
        asaas_subscription_id: payment.id,
        billing_cycle: 'lifetime',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' });
      return response.status(200).json({
        checkoutUrl,
        subscriptionId: payment.id,
        pixQr: qr,
        pixCode: code,
        billingType,
        lifetime: true,
        message: 'Pagamento único: após confirmar, seu acesso vira vitalício. Clique em Já paguei.',
      });
    }
    const pixManual = billingType === 'PIX' && billing.cycle === 'monthly';
    let subscription: AsaasSubscription;
    try {
      subscription = await asaasRequest<AsaasSubscription>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({
          customer: customerId,
          billingType,
          value: billing.value,
          cycle: billing.asaasCycle,
          nextDueDate,
          description: `ClimaPro ${billing.label} - ${billing.cycle === 'yearly' ? 'anual' : 'mensal'}`,
          externalReference: profile.company_id,
        }),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (billingType === 'CREDIT_CARD' && /billingType|credit/i.test(msg)) {
        subscription = await asaasRequest<AsaasSubscription>('/subscriptions', {
          method: 'POST',
          body: JSON.stringify({
            customer: customerId,
            billingType: 'UNDEFINED',
            value: billing.value,
            cycle: billing.asaasCycle,
            nextDueDate,
            description: `ClimaPro ${billing.label} - ${billing.cycle === 'yearly' ? 'anual' : 'mensal'}`,
            externalReference: profile.company_id,
          }),
        });
      } else {
        throw e;
      }
    }

    let checkoutUrl: string | null = null;
    let pixQr: string | null = null;
    let pixCode: string | null = null;
    let paymentId: string | null = null;
    try {
      const payments = await asaasRequest<{ data?: Array<AsaasPayment & { id?: string }> }>(`/subscriptions/${subscription.id}/payments`);
      const payment = payments.data?.[0];
      paymentId = payment?.id || null;
      checkoutUrl = payment?.invoiceUrl || payment?.bankSlipUrl || payment?.paymentLink || null;
    } catch { /* assinatura criada; cobrança aparece em seguida no Asaas */ }
    if (billingType === 'PIX' && paymentId) {
      try {
        const qr = await asaasRequest<{ encodedImage?: string; payload?: string }>(`/payments/${paymentId}/pixQrCode`, { method: 'GET' });
        pixQr = qr.encodedImage ? `data:image/png;base64,${qr.encodedImage}` : null;
        pixCode = qr.payload || null;
      } catch { /* mantém checkoutUrl padrão */ }
    }
    if (!checkoutUrl && paymentId) {
      try {
        const payment = await asaasRequest<AsaasPayment>(`/payments/${paymentId}`, { method: 'GET' });
        checkoutUrl = payment?.invoiceUrl || payment?.bankSlipUrl || payment?.paymentLink || null;
      } catch { /* segue sem URL: front mostra mensagem */ }
    }

    await supabase.from('subscriptions').upsert({
      company_id: profile.company_id,
      plan: billing.planKey,
      status: 'past_due',
      asaas_customer_id: customerId,
      asaas_subscription_id: subscription.id,
      billing_cycle: billing.cycle,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });

    return response.status(200).json({ checkoutUrl, subscriptionId: subscription.id, pixQr, pixCode, billingType, pixManual, message: pixManual ? 'PIX válido para a 1ª parcela. As próximas são geradas todo mês no app — ative o lembrete.' : null });
  } catch (error: unknown) {
    console.error('[billing/checkout]', error);
    return response.status(400).json({ error: error instanceof Error ? error.message : 'Não foi possível criar a assinatura.' });
  }
}
