import { supabase } from './supabaseClient';
import { emitDataChanged } from './tableBus';

let channel: ReturnType<typeof supabase.channel> | null = null;
let started = false;
let lastStart = 0;

const TABLES = [
  'customers', 'service_orders', 'budgets', 'equipment', 'companies',
  'notifications', 'payments', 'profiles', 'appointments', 'materials',
  'subscriptions', 'expenses', 'losses',
] as const;

const mergeTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function emitDebounced(table: string, waitMs = 1200) {
  const t = mergeTimers.get(table);
  if (t) clearTimeout(t);
  mergeTimers.set(
    table,
    setTimeout(() => {
      mergeTimers.delete(table);
      emitDataChanged(table);
    }, waitMs),
  );
}

export type RealtimeStatus = 'off' | 'connecting' | 'on' | 'error';

let status: RealtimeStatus = 'off';
const statusListeners = new Set<(s: RealtimeStatus) => void>();

function setStatus(s: RealtimeStatus) {
  status = s;
  statusListeners.forEach((fn) => fn(s));
}

export function getRealtimeStatus(): RealtimeStatus {
  return status;
}

export function subscribeRealtimeStatus(fn: (s: RealtimeStatus) => void): () => void {
  statusListeners.add(fn);
  fn(status);
  return () => { statusListeners.delete(fn); };
}

export function startRealtime(): void {
  if (started || typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastStart < 5000) return;
  lastStart = now;
  started = true;
  setStatus('connecting');
  try {
    const builder = supabase.channel('rt-app');
    TABLES.forEach((table) => {
      builder.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        emitDebounced(table);
      });
    });
    channel = builder.subscribe((st) => {
      if (st === 'SUBSCRIBED') setStatus('on');
      if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('error');
    });
    setTimeout(() => { if (getRealtimeStatus() === 'connecting') setStatus('on'); }, 4000);
  } catch {
    started = false;
    setStatus('error');
  }
}

export function stopRealtime(): void {
  if (channel) {
    try { supabase.removeChannel(channel); } catch { /* noop */ }
    channel = null;
  }
  started = false;
}
