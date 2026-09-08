import { supabase } from './supabaseClient';

export type BillingCycle = 'monthly' | 'yearly';

export type CheckoutMethod = 'pix' | 'card' | 'boleto';

export async function startCheckout(planKey: string, cycle: BillingCycle, method: CheckoutMethod = 'card') {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');

  const response = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ planKey, cycle, method }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Não foi possível iniciar o pagamento.');
  return body as { checkoutUrl: string | null; subscriptionId: string; pixQr: string | null; pixCode: string | null; billingType: string; pixManual?: boolean; message?: string | null };
}
