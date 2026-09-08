export type PlanKey = 'trial' | 'start' | 'pro' | 'master';
export type SubStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface Plan {
  key: PlanKey;
  name: string;
  tagline: string;
  price: number;
  osPerMonth: number;
  technicians: number;
  features: string[];
  highlight?: boolean;
  cta: string;
}

export const TRIAL_DAYS = 14;

export const PLANS: Plan[] = [
  {
    key: 'start',
    name: 'Gelo Fino',
    tagline: 'Se paga na 1ª higienização · R$1,57/OS',
    price: 47,
    osPerMonth: 30,
    technicians: 1,
    cta: 'Assinar por R$47/mês',
    features: [
      'Até 30 OS por mês (R$1,57 cada)',
      '1 técnico + dono grátis',
      'Agenda + clientes + orçamentos',
      'PDF com sua marca no WhatsApp',
      'Suporte por WhatsApp em português',
    ],
  },
  {
    key: 'pro',
    name: 'Clima Ideal',
    tagline: 'Meia higienização paga o mês · R$0,65/OS',
    price: 97,
    osPerMonth: 150,
    technicians: 5,
    highlight: true,
    cta: 'Assinar o Pro por R$97',
    features: [
      'Até 150 OS por mês (R$0,65 cada)',
      'Até 5 técnicos sem taxa por usuário',
      'Cockpit do técnico + laudo por voz',
      'Cálculo de superaquecimento',
      'Ranking + BI que mostra quem lucra',
      'Cobrança via WhatsApp',
      'Suporte prioritário',
    ],
  },
  {
    key: 'master',
    name: 'Tempestade Polar',
    tagline: 'Para quem fatura alto · custo por OS tende a zero',
    price: 197,
    osPerMonth: Number.POSITIVE_INFINITY,
    technicians: Number.POSITIVE_INFINITY,
    cta: 'Assinar Master por R$197',
    features: [
      'OS ilimitadas — escala sem custo extra',
      'Técnicos ilimitados sem taxa por usuário',
      'Tudo do Pro incluso',
      'Multi-filiais (em breve)',
      'API + integrações',
      'Gerente de conta dedicado',
    ],
  },
];

export function getPlan(key: string): Plan {
  return PLANS.find((p) => p.key === key) || PLANS[1];
}

export interface Subscription {
  id: string;
  companyId: string;
  plan: PlanKey;
  status: SubStatus;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  createdAt?: string;
}

function trialStart(sub: Subscription): number {
  if (sub.trialEndsAt) return new Date(sub.trialEndsAt).getTime() - TRIAL_DAYS * 86400000;
  if (sub.createdAt) return new Date(sub.createdAt).getTime();
  return Date.now();
}

export function trialDaysLeft(sub: Subscription | null): number {
  if (!sub || sub.status !== 'trialing') return 0;
  if (sub.trialEndsAt) {
    const diff = new Date(sub.trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }
  if (sub.createdAt) {
    const diff = new Date(sub.createdAt).getTime() + TRIAL_DAYS * 86400000 - Date.now();
    return Math.max(0, Math.ceil(diff / 86400000));
  }
  return TRIAL_DAYS;
}

export function trialStartedAt(sub: Subscription | null): number {
  if (!sub) return Date.now();
  return trialStart(sub);
}

export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return true;
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing') return trialDaysLeft(sub) > 0;
  return false;
}

export function isExpired(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status === 'active') return false;
  if (sub.status === 'trialing') return trialDaysLeft(sub) <= 0;
  return ['past_due', 'canceled', 'expired'].includes(sub.status);
}

export function readOnly(sub: Subscription | null): boolean {
  return isExpired(sub);
}

export function effectivePlan(sub: Subscription | null): Plan {
  if (!sub) return getPlan('pro');
  if (sub.status === 'trialing') return getPlan('pro');
  return getPlan(sub.plan === 'trial' ? 'start' : sub.plan);
}

export function formatLimit(n: number): string {
  return Number.isFinite(n) ? String(n) : 'Ilimitado';
}
