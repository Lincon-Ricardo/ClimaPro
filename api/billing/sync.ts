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
      .select('asaas_subscription_id')
      .eq('company_id', profile.company_id)
      .maybeSingle();
    const subId = current?.asaas_subscription_id as string | undefined;
    if (!subId) return response.status(404).json({ error: 'Nenhuma assinatura encontrada.' });
    const payments = await asaasRequest<{ data?: { status?: string }[] }>(`/subscriptions/${subId}/payments`, { method: 'GET' });
    const paid = (payments.data || []).some((p) => ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'].includes(String(p.status)));
    if (!paid) return response.status(200).json({ ok: true, synced: false, message: 'Pagamento ainda pendente no Asaas.' });
    await supabase
      .from('subscriptions')
      .update({ status: 'active', last_webhook_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('company_id', profile.company_id);
    return response.status(200).json({ ok: true, synced: true });
  } catch (error: any) {
    return response.status(400).json({ error: error?.message || 'Falha na sincronização.' });
  }
}
