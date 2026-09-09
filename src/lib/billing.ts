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
  const body = (await response.json().catch(() => ({}))) as { error?: string; checkoutUrl?: string | null; subscriptionId?: string; pixQr?: string | null; pixCode?: string | null; billingType?: string; pixManual?: boolean; message?: string | null };
  if (!response.ok) {
    if (response.status === 409) throw new Error(body.error || 'Sua empresa já está neste plano.');
    throw new Error(body.error || 'Não foi possível iniciar o pagamento.');
  }
  return {
    checkoutUrl: body.checkoutUrl || null,
    subscriptionId: body.subscriptionId || '',
    pixQr: body.pixQr || null,
    pixCode: body.pixCode || null,
    billingType: body.billingType || '',
    pixManual: body.pixManual,
    message: body.message || null,
  };
}
