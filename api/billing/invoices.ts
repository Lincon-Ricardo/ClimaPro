import { asaasRequest } from '../_lib/asaas.js';
import { getAdminClient, getBearerToken } from '../_lib/supabase.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AsaasPaymentRow {
  id?: string;
  value?: number;
  dueDate?: string;
  status?: string;
  billingType?: string;
  description?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  paymentLink?: string;
}

function normalize(p: AsaasPaymentRow) {
  return {
    id: p.id || '',
    value: typeof p.value === 'number' ? p.value : 0,
    dueDate: p.dueDate || null,
    status: p.status || 'UNKNOWN',
    billingType: p.billingType || '',
    description: p.description || '',
    payUrl: p.invoiceUrl || p.bankSlipUrl || p.paymentLink || null,
  };
}

/**
 * GET /api/billing/invoices — lista as cobranças da empresa no Asaas
 * para a tela "Minhas cobranças" (pagar, reemitir, verificar).
 */
export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método não permitido.', code: 'METHOD' });
  try {
    const token = getBearerToken(request);
    if (!token) return response.status(401).json({ error: 'Sessão ausente.', code: 'SESSION' });
    const supabase = getAdminClient();
    const { data: auth } = await supabase.auth.getUser(token);
    if (!auth.user) return response.status(401).json({ error: 'Sessão inválida.', code: 'SESSION' });
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', auth.user.id)
      .single();
    if (!profile) return response.status(403).json({ error: 'Perfil não encontrado.', code: 'NOT_ADMIN' });
    const { data: current } = await supabase
      .from('subscriptions')
      .select('asaas_customer_id, asaas_subscription_id, plan, status')
      .eq('company_id', profile.company_id)
      .maybeSingle() as { data: { asaas_customer_id?: string | null; asaas_subscription_id?: string | null; plan?: string | null; status?: string | null } | null };
    const refId = current?.asaas_subscription_id || '';
    if (!refId) return response.status(200).json({ ok: true, invoices: [] });

    let rows: AsaasPaymentRow[] = [];
    if (current?.plan === 'lifetime') {
      // No vitalício guardamos o ID do pagamento único em asaas_subscription_id.
      try {
        const single = await asaasRequest<AsaasPaymentRow>(`/payments/${refId}`, { method: 'GET' });
        if (single?.id) rows = [single];
      } catch { rows = []; }
    } else {
      try {
        const list = await asaasRequest<{ data?: AsaasPaymentRow[] }>(`/subscriptions/${refId}/payments?limit=12`, { method: 'GET' });
        rows = Array.isArray(list.data) ? list.data : [];
      } catch { rows = []; }
    }
    return response.status(200).json({ ok: true, invoices: rows.map(normalize) });
  } catch (error: unknown) {
    console.error('[billing/invoices]', error);
    return response.status(400).json({ error: 'Não foi possível listar as cobranças.', code: 'INVOICES_FAILED' });
  }
}
