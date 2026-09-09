import { useMemo } from 'react';
import { useLiveQuery } from './useLiveQuery';
import { db } from '../lib/db';
import {
  effectivePlan, isSubscriptionActive, isExpired, trialDaysLeft, readOnly,
  type Subscription,
} from '../lib/plans';

interface SubscriptionRow {
  id: string;
  companyId?: string;
  plan: Subscription['plan'];
  status: Subscription['status'];
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  createdAt?: string;
}

function toSubscription(row: Record<string, unknown> | null | undefined): Subscription | null {
  if (!row || typeof row !== 'object') return null;
  const plan = row.plan;
  const status = row.status;
  if (plan !== 'trial' && plan !== 'start' && plan !== 'pro' && plan !== 'master') return null;
  if (status !== 'trialing' && status !== 'active' && status !== 'past_due' && status !== 'canceled' && status !== 'expired') return null;
  return {
    id: String(row.id || ''),
    companyId: String(row.companyId || ''),
    plan,
    status,
    trialEndsAt: typeof row.trialEndsAt === 'string' ? row.trialEndsAt : undefined,
    currentPeriodEnd: typeof row.currentPeriodEnd === 'string' ? row.currentPeriodEnd : undefined,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : undefined,
  };
}

export function useSubscription() {
  const subsRaw = useLiveQuery(() => db.subscriptions.list({ pageSize: 1 }).then((r) => r.rows[0]), [], 'subscriptions');
  const monthKey = new Date().toISOString().slice(0, 7);
  const orders = useLiveQuery(
    () => db.serviceOrders.list({ pageSize: 500, gte: { createdAt: `${monthKey}-01` }, order: { column: 'createdAt' } }).then((r) => r.rows),
    [monthKey],
    'service_orders',
  ) || [];
  const teamCount = useLiveQuery(() => db.users.count(), [], 'profiles') ?? 0;

  const subRow = subsRaw as unknown as SubscriptionRow | Record<string, unknown> | null | undefined;
  const sub = toSubscription(subRow as Record<string, unknown> | null | undefined);
  const plan = effectivePlan(sub);
  const active = isSubscriptionActive(sub);
  const expired = isExpired(sub);
  const trialLeft = trialDaysLeft(sub);
  const isTrial = sub?.status === 'trialing';
  const trialNotStarted = isTrial && !sub?.trialEndsAt;
  const locked = readOnly(sub);
  const trialProgress = isTrial ? Math.max(0, Math.min(100, ((14 - trialLeft) / 14) * 100)) : 100;

  const osThisMonth = orders.length;
  const techCount = Math.max(0, teamCount - 1);

  const osAllowed = plan.osPerMonth;
  const osBlocked = osThisMonth >= osAllowed;
  const techAllowed = plan.technicians;
  const techBlocked = techCount >= techAllowed;

  return useMemo(() => ({
    sub, plan, active, expired, isTrial, trialLeft, trialNotStarted, locked, trialProgress,
    osThisMonth, osAllowed, osBlocked,
    techCount, techAllowed, techBlocked,
  }), [sub, plan, active, expired, isTrial, trialLeft, trialNotStarted, locked, trialProgress, osThisMonth, osAllowed, osBlocked, techCount, techAllowed, techBlocked]);
}
