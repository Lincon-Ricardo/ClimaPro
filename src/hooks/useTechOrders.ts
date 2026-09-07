import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import type { ServiceOrder } from '../types';

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

export function matchesTech(technician: unknown, techName: string, techFirstName: string): boolean {
  const t = norm(technician);
  if (!t) return false;
  if (!techName && !techFirstName) return false;
  if (t === techName || (techFirstName && t === techFirstName)) return true;
  if (!techFirstName) return false;
  const tokens = t.split(/\s+/);
  return tokens.includes(techFirstName);
}

export function useTechFilter() {
  const { user } = useAuth();
  const isTech = user?.role === 'tech';
  const techName = norm(user?.name);
  const techFirstName = norm((user as { firstName?: string } | null)?.firstName);

  const filterMine = <T extends Pick<ServiceOrder, 'technician'>>(orders: T[]): T[] => {
    if (!isTech) return orders;
    return orders.filter((o) => matchesTech(o.technician, techName, techFirstName));
  };

  return { isTech, techName, techFirstName, filterMine };
}

export function useMyOrders<T extends Pick<ServiceOrder, 'technician'>>(
  orders: T[] | undefined,
  roleOverride?: string,
): T[] {
  const { user } = useAuth();
  const role = roleOverride ?? user?.role;
  const techName = norm(user?.name);
  const techFirstName = norm((user as { firstName?: string } | null)?.firstName);

  return useMemo(() => {
    if (!orders) return [];
    if (role === 'admin') return orders;
    if (role !== 'tech') return orders;
    return orders.filter((o) => matchesTech(o.technician, techName, techFirstName));
  }, [orders, role, techName, techFirstName]);
}
