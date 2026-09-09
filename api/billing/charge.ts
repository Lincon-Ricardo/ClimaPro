import { asaasRequest } from '../_lib/asaas.js';
import { getAdminClient, getBearerToken } from '../_lib/supabase.js';
import { rateLimit, clientKey } from '../_lib/rateLimit.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChargeBody {
  customerId?: string;
  orderId?: string;
  value?: number;
  description?: string;
  dueInDays?: number;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  if (!rateLimit(clientKey(request, ':charge'), 20, 60_000)) {
    return response.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto.' });
  }
  try {
    const token = getBearerToken(request);
    if (!token) return response.status(401).json({ error: 'Sessão ausente.' });
    const supabase = getAdminClient();
    const { data: auth } = await supabase.auth.getUser(token);
    if (!auth.user) return response.status(401).json({ error: 'Sessão inválida.' });
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', auth.user.id)
      .single();
    if (!profile || profile.role !== 'admin') return response.status(403).json({ error: 'Somente administradores.' });

    const body = (request.body || {}) as ChargeBody;
    const value = Number(body.value);
    if (!body.customerId || !value || value <= 0) {
      return response.status(400).json({ error: 'Cliente e valor são obrigatórios.' });
    }
    if (value > 100000) return response.status(400).json({ error: 'Valor acima do limite (R$100.000).' });

    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email, phone, whatsapp, document, company_id')
      .eq('id', body.customerId)
      .single();
    if (!customer || customer.company_id !== profile.company_id) {
      return response.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const doc = String(customer.document || '').replace(/\D/g, '');
    if (doc && doc.length !== 11 && doc.length !== 14) {
      return response.status(400).json({ error: 'CPF/CNPJ do cliente inválido. Corrija o cadastro.' });
    }
    const email = String(customer.email || '').trim();
    const phone = String(customer.whatsapp || customer.phone || '').replace(/\D/g, '');

    let asaasCustomerId = '';
    const queries = [
      ...(doc ? [`/customers?cpfCnpj=${doc}`] : []),
      ...(email ? [`/customers?email=${encodeURIComponent(email)}`] : []),
    ];
    for (const q of queries) {
      try {
        const found = await asaasRequest<{ data?: Array<{ id: string }> }>(q, { method: 'GET' });
        if (found.data?.[0]?.id) { asaasCustomerId = found.data[0].id; break; }
      } catch { /* tenta próxima */ }
    }
    if (!asaasCustomerId) {
      const created = await asaasRequest<{ id: string }>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: customer.name,
          ...(email ? { email } : {}),
          ...(phone ? { mobilePhone: phone } : {}),
          ...(doc ? { cpfCnpj: doc } : {}),
          externalReference: customer.id,
        }),
      });
      asaasCustomerId = created.id;
    }

    const dueDate = new Date(Date.now() + (Math.min(Math.max(body.dueInDays ?? 3, 0), 30) * 86400000)).toISOString().slice(0, 10);
    const payment = await asaasRequest<{ id: string; invoiceUrl?: string; bankSlipUrl?: string; pixQrCode?: string }>(
      '/payments',
      {
        method: 'POST',
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: 'UNDEFINED',
          value: Math.round(value * 100) / 100,
          dueDate,
          description: String(body.description || 'Cobrança ClimaPro').slice(0, 200),
          externalReference: body.orderId || customer.id,
        }),
      },
    );
    const payUrl = payment.invoiceUrl || payment.bankSlipUrl || null;
    return response.status(200).json({ ok: true, paymentId: payment.id, payUrl, dueDate });
  } catch (error: unknown) {
    console.error('[billing/charge]', error);
    return response.status(400).json({ error: error instanceof Error ? error.message : 'Não foi possível gerar a cobrança.' });
  }
}
