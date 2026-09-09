import { supabase } from './supabaseClient';

export interface ChargeResult {
  paymentId: string;
  payUrl: string | null;
  dueDate: string;
}

export async function createCharge(opts: {
  customerId: string;
  orderId?: string;
  value: number;
  description?: string;
  dueInDays?: number;
}): Promise<ChargeResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
  const response = await fetch('/api/billing/charge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(opts),
  });
  const body = (await response.json().catch(() => ({}))) as { error?: string } & Partial<ChargeResult>;
  if (!response.ok) throw new Error(body.error || 'Não foi possível gerar a cobrança.');
  return { paymentId: body.paymentId || '', payUrl: body.payUrl || null, dueDate: body.dueDate || '' };
}

export function chargeWhatsLink(phone: string | undefined, text: string): string | null {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const num = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
