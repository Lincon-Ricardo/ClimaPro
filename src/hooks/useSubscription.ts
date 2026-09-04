import { useMemo } from 'react';
import { useLiveQuery } from './useLiveQuery';
import { db } from '../lib/db';
import {
  effectivePlan, isSubscriptionActive, isExpired, trialDaysLeft,
  type Subscription,
} from '../lib/plans';

export function useSubscription() {
  const subsRaw = useLiveQuery(() => (db as any).subscriptions?.toArray?.() || Promise.resolve([]), []);
  const orders = useLiveQuery(() => db.serviceOrders.toArray(), []) || [];
  const team = useLiveQuery(() => db.users.toArray(), []) || [];

  const sub = (((subsRaw || []) as any[])[0] || null) as Subscription | null;
  const plan = effectivePlan(sub);
  const active = isSubscriptionActive(sub);
  const expired = isExpired(sub);
  const trialLeft = trialDaysLeft(sub);
  const isTrial = sub?.status === 'trialing';
  const trialNotStarted = isTrial && !sub?.trialEndsAt;

  const monthKey = new Date().toISOString().slice(0, 7);
  const osThisMonth = orders.filter((o) => (o.createdAt || o.date || '').startsWith(monthKey)).length;
  const techCount = Math.max(0, team.length - 1);

  const osAllowed = plan.osPerMonth;
  const osBlocked = osThisMonth >= osAllowed;
  const techAllowed = plan.technicians;
  const techBlocked = techCount >= techAllowed;

  return useMemo(() => ({
    sub, plan, active, expired, isTrial, trialLeft, trialNotStarted,
    osThisMonth, osAllowed, osBlocked,
    techCount, techAllowed, techBlocked,
  }), [sub, plan, active, expired, isTrial, trialLeft, trialNotStarted, osThisMonth, osAllowed, osBlocked, techCount, techAllowed, techBlocked]);
}
