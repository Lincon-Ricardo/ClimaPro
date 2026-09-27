import { supabase } from './supabaseClient';

export type BillingCycle = 'monthly' | 'yearly' | 'lifetime';

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
  const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string; checkoutUrl?: string | null; subscriptionId?: string; pixQr?: string | null; pixCode?: string | null; billingType?: string; pixManual?: boolean; lifetime?: boolean; pending?: boolean; message?: string | null };
  if (!response.ok) {
    if (response.status === 409) {
      const err = new Error(body.error || 'Sua empresa já está neste plano.') as Error & { code?: string };
      err.code = body.code;
      throw err;
    }
    const err = new Error(body.error || 'Não foi possível iniciar o pagamento.') as Error & { code?: string };
    err.code = body.code;
    throw err;
  }
  return {
    checkoutUrl: body.checkoutUrl || null,
    subscriptionId: body.subscriptionId || '',
    pixQr: body.pixQr || null,
    pixCode: body.pixCode || null,
    billingType: body.billingType || '',
    pixManual: body.pixManual,
    lifetime: body.lifetime === true,
    pending: body.pending === true,
    code: body.code || '',
    message: body.message || null,
  };
}

export interface Invoice {
  id: string;
  value: number;
  dueDate: string | null;
  status: string;
  billingType: string;
  description: string;
  payUrl: string | null;
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  const response = await fetch('/api/billing/invoices', {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string; invoices?: Invoice[] };
  if (!response.ok) {
    const err = new Error(body.error || 'Não foi possível listar as cobranças.') as Error & { code?: string };
    err.code = body.code;
    throw err;
  }
  return Array.isArray(body.invoices) ? body.invoices : [];
}

export async function verifyPayment(): Promise<{ synced: boolean; message?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  const response = await fetch('/api/billing/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  });
  const body = (await response.json().catch(() => ({}))) as { synced?: boolean; message?: string; error?: string; code?: string };
  if (!response.ok) {
    const err = new Error(body.error || 'Falha na verificação.') as Error & { code?: string };
    err.code = body.code;
    throw err;
  }
  return { synced: body.synced === true, message: body.message };
}
