import { getAdminClient } from '../_lib/supabase.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function statusFromEvent(event: string): string | null {
  if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_RECEIVED_IN_CASH', 'SUBSCRIPTION_ACTIVATED'].includes(event)) return 'active';
  if (['PAYMENT_OVERDUE', 'PAYMENT_DUNNING_RECEIVED', 'PAYMENT_DUNNING_REQUESTED'].includes(event)) return 'past_due';
  if (['SUBSCRIPTION_INACTIVATED', 'SUBSCRIPTION_DELETED', 'SUBSCRIPTION_EXPIRED'].includes(event)) return 'canceled';
  return null;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método não permitido.' });
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  const h = request.headers as Record<string, string | string[] | undefined>;
  const pick = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
  const receivedToken = pick(h['asaas-access-token']) || pick(h['x-asaas-token']) || pick(h['webhook-token']) || (request.query as { token?: string })?.token;
  if (!expected || !receivedToken || receivedToken !== expected) return response.status(401).json({ error: 'Não autorizado.' });

  try {
    const payload = request.body || {};
    const eventId = String(payload.id || `${payload.event}-${payload.payment?.id || payload.subscription?.id || Date.now()}`);
    const event = String(payload.event || '');
    const subscriptionId = payload.payment?.subscription || payload.subscription?.id;
    const status = statusFromEvent(event);
    const supabase = getAdminClient();

    const { error: eventError } = await supabase.from('billing_events').insert({
      event_id: eventId,
      event_type: event,
      asaas_subscription_id: subscriptionId || null,
      payload: payload,
      status: 'received',
    });
    if (eventError?.code === '23505') return response.status(200).json({ ok: true, duplicate: true });
    if (eventError) throw eventError;

    if (status && subscriptionId) {
      await supabase
        .from('subscriptions')
        .update({ status, last_webhook_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('asaas_subscription_id', subscriptionId);
    }

    await supabase.from('billing_events').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('event_id', eventId);
    return response.status(200).json({ ok: true });
  } catch (error: unknown) {
    console.error('[billing/webhook]', error);
    return response.status(500).json({ error: 'Erro ao processar webhook.' });
  }
}
