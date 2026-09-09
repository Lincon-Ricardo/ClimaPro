const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://api-sandbox.asaas.com/v3';

function getApiKey() {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error('ASAAS_API_KEY não configurada.');
  return key;
}

export async function asaasRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ASAAS_API_URL}${path}`, {
    ...init,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      access_token: getApiKey(),
      ...(init.headers || {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as { errors?: Array<{ description?: string }> };
  if (!response.ok) {
    console.error('[asaas]', path, response.status, JSON.stringify(body).slice(0, 2000));
    const detail = Array.isArray(body?.errors) ? body.errors.map((e) => e.description).filter(Boolean).join('; ') : 'Resposta inválida do Asaas.';
    throw new Error(detail || `Asaas respondeu HTTP ${response.status}.`);
  }
  return body as T;
}

export interface AsaasCustomer {
  id: string;
}

export interface AsaasSubscription {
  id: string;
  status: string;
}

export interface AsaasPayment {
  invoiceUrl?: string;
  bankSlipUrl?: string;
  paymentLink?: string;
  status?: string;
}

export const BILLING_PLANS = {
  start: { monthly: 47, yearly: 451.2, label: 'Gelo Fino' },
  pro: { monthly: 97, yearly: 931.2, label: 'Clima Ideal' },
  master: { monthly: 197, yearly: 1891.2, label: 'Tempestade Polar' },
} as const;

export type BillingPlanKey = keyof typeof BILLING_PLANS;
export type BillingCycle = 'monthly' | 'yearly';

export function getBillingPlan(planKey: unknown, cycle: unknown) {
  if (typeof planKey !== 'string' || !(planKey in BILLING_PLANS)) throw new Error('Plano inválido.');
  if (cycle !== 'monthly' && cycle !== 'yearly') throw new Error('Ciclo inválido.');
  const plan = BILLING_PLANS[planKey as BillingPlanKey];
  return {
    planKey: planKey as BillingPlanKey,
    cycle: cycle as BillingCycle,
    value: plan[cycle as BillingCycle],
    asaasCycle: cycle === 'yearly' ? 'YEARLY' : 'MONTHLY',
    label: plan.label,
  };
}
