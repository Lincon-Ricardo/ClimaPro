import { asaasRequest, getBillingPlan, type AsaasCustomer, type AsaasPayment, type AsaasSubscription } from '../_lib/asaas';
import { getAdminClient, getBearerToken } from '../_lib/supabase';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });

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
      .select('asaas_customer_id, asaas_subscription_id, status')
      .eq('company_id', profile.company_id)
      .maybeSingle();
    if (current?.asaas_subscription_id && ['active', 'past_due'].includes(current.status)) {
      return response.status(409).json({ error: 'Sua empresa já possui uma assinatura em andamento.' });
    }
    customerId = current?.asaas_customer_id || '';

    if (!customerId) {
      const customer = await asaasRequest<AsaasCustomer>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: company.name,
          email: company.email || profile.email || auth.user.email,
          phone: company.phone || undefined,
          cpfCnpj: company.cnpj || undefined,
          externalReference: profile.company_id,
        }),
      });
      customerId = customer.id;
    }

    const nextDueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const subscription = await asaasRequest<AsaasSubscription>('/subscriptions', {
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

    const payments = await asaasRequest<{ data?: AsaasPayment[] }>(`/subscriptions/${subscription.id}/payments`);
    const payment = payments.data?.[0];
    const checkoutUrl = payment?.invoiceUrl || payment?.bankSlipUrl || payment?.paymentLink || null;

    await supabase.from('subscriptions').upsert({
      company_id: profile.company_id,
      plan: billing.planKey,
      status: 'past_due',
      asaas_customer_id: customerId,
      asaas_subscription_id: subscription.id,
      billing_cycle: billing.cycle,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });

    return response.status(200).json({ checkoutUrl, subscriptionId: subscription.id });
  } catch (error: any) {
    console.error('[billing/checkout]', error);
    return response.status(400).json({ error: error?.message || 'Não foi possível criar a assinatura.' });
  }
}
