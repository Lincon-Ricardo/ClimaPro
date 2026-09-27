import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método não permitido.' });
  const apiUrl = process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3';
  const asaasEnv = apiUrl.includes('sandbox') ? 'sandbox' : apiUrl.includes('api.asaas.com') ? 'production' : 'unknown';
  const hasKey = Boolean(process.env.ASAAS_API_KEY);
  const hasWebhookToken = Boolean(process.env.ASAAS_WEBHOOK_TOKEN);
  const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  let asaasReachable: boolean | null = null;
  let asaasDetail: string | null = null;
  if (hasKey) {
    try {
      const r = await fetch(`${apiUrl}/customers?limit=1`, {
        headers: { accept: 'application/json', access_token: process.env.ASAAS_API_KEY as string },
      });
      asaasReachable = r.ok;
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        asaasDetail = `HTTP ${r.status} ${body.slice(0, 200)}`;
      }
    } catch (e) {
      asaasReachable = false;
      asaasDetail = e instanceof Error ? e.message : String(e);
    }
  }
  return response.status(200).json({
    ok: true,
    asaasEnv,
    hasKey,
    hasWebhookToken,
    hasSupabase,
    asaasReachable,
    asaasDetail,
    webhookUrl: `https://${request.headers.host || 'clima-pro-chi.vercel.app'}/api/billing/webhook`,
  });
}
