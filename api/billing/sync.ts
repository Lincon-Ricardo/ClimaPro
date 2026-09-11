import { asaasRequest } from '../_lib/asaas.js';
import { getAdminClient, getBearerToken } from '../_lib/supabase.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
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
    const { data: current } = await supabase
      .from('subscriptions')
      .select('asaas_subscription_id, plan, status')
      .eq('company_id', profile.company_id)
      .maybeSingle();
    if (current?.plan === 'lifetime' && current?.status === 'lifetime') {
      return response.status(200).json({ ok: true, synced: true, lifetime: true });
    }
    const subId = current?.asaas_subscription_id as string | undefined;
    if (!subId) return response.status(404).json({ error: 'Nenhuma assinatura encontrada.' });
    const lifetimePending = current?.plan === 'lifetime';
    const payments = lifetimePending
      ? await asaasRequest<{ status?: string }>(`/payments/${subId}`, { method: 'GET' }).then((p) => ({ data: [p] })).catch(() => ({ data: [] }))
      : await asaasRequest<{ data?: Array<{ status?: string; confirmedDate?: string; paymentDate?: string }> }>(`/subscriptions/${subId}/payments?limit=20&status=CONFIRMED,RECEIVED,RECEIVED_IN_CASH,OVERDUE`, { method: 'GET' });
    const list = payments.data || [];
    const paid = list.some((p) => ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(String(p.status)));
    const overdue = !paid && list.some((p) => String(p.status) === 'OVERDUE');
    if (lifetimePending && paid) {
      await supabase
        .from('subscriptions')
        .update({ status: 'lifetime', last_webhook_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('company_id', profile.company_id);
      return response.status(200).json({ ok: true, synced: true, lifetime: true });
    }
    const nextStatus = paid ? 'active' : overdue ? 'past_due' : null;
    if (nextStatus) {
      await supabase
        .from('subscriptions')
        .update({ status: nextStatus, last_webhook_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('company_id', profile.company_id);
    }
    if (paid) return response.status(200).json({ ok: true, synced: true });
    if (overdue) return response.status(200).json({ ok: true, synced: false, message: 'Pagamento vencido no Asaas. Gere uma nova cobrança.' });
    return response.status(200).json({ ok: true, synced: false, message: 'Pagamento ainda pendente no Asaas.' });
  } catch (error: unknown) {
    return response.status(400).json({ error: error instanceof Error ? error.message : 'Falha na sincronização.' });
  }
}
