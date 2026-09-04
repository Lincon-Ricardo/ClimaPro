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
    tagline: 'Para quem está começando a gelar',
    price: 47,
    osPerMonth: 30,
    technicians: 1,
    cta: 'Começar pequeno',
    features: [
      'Até 30 OS por mês',
      '1 técnico + dono',
      'Agenda + clientes + orçamentos',
      'PDF com sua marca',
      'Suporte por WhatsApp',
    ],
  },
  {
    key: 'pro',
    name: 'Clima Ideal',
    tagline: 'Para equipes que vivem no campo',
    price: 97,
    osPerMonth: 150,
    technicians: 5,
    highlight: true,
    cta: 'Assinar o Pro',
    features: [
      'Até 150 OS por mês',
      'Até 5 técnicos',
      'Cockpit do técnico + laudo por voz',
      'Cálculo de superaquecimento',
      'Ranking + BI gerencial',
      'Cobrança via WhatsApp',
      'Suporte prioritário',
    ],
  },
  {
    key: 'master',
    name: 'Tempestade Polar',
    tagline: 'Para dominar a cidade inteira',
    price: 197,
    osPerMonth: Number.POSITIVE_INFINITY,
    technicians: Number.POSITIVE_INFINITY,
    cta: 'Dominar tudo',
    features: [
      'OS ilimitadas',
      'Técnicos ilimitados',
      'Tudo do Pro',
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
}

export function trialDaysLeft(sub: Subscription | null): number {
  if (!sub || sub.status !== 'trialing') return 0;
  if (!sub.trialEndsAt) return TRIAL_DAYS;
  const diff = new Date(sub.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return true;
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing' && !sub.trialEndsAt) return true;
  if (sub.status === 'trialing') return trialDaysLeft(sub) > 0;
  return false;
}

export function isExpired(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status === 'active') return false;
  if (sub.status === 'trialing') return !!sub.trialEndsAt && trialDaysLeft(sub) <= 0;
  return ['past_due', 'canceled', 'expired'].includes(sub.status);
}

export function effectivePlan(sub: Subscription | null): Plan {
  if (!sub) return getPlan('pro');
  if (sub.status === 'trialing') return getPlan('pro');
  return getPlan(sub.plan === 'trial' ? 'start' : sub.plan);
}

export function formatLimit(n: number): string {
  return Number.isFinite(n) ? String(n) : 'Ilimitado';
}
