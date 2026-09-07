import { supabase } from './supabaseClient';
import { emitDataChanged } from './tableBus';

const channels = new Map<string, ReturnType<typeof supabase.channel>>();
let started = false;

const TABLES = [
  'customers', 'service_orders', 'budgets', 'equipment', 'companies',
  'notifications', 'payments', 'profiles', 'appointments', 'materials',
] as const;

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
  started = true;
  setStatus('connecting');
  try {
    TABLES.forEach((table) => {
      const ch = supabase
        .channel(`rt-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
          emitDataChanged(table);
        })
        .subscribe((st) => {
          if (st === 'SUBSCRIBED') setStatus('on');
          if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') setStatus('error');
        });
      channels.set(table, ch);
    });
    setTimeout(() => { if (getRealtimeStatus() === 'connecting') setStatus('on'); }, 4000);
  } catch {
    started = false;
    setStatus('error');
  }
}

export function stopRealtime(): void {
  channels.forEach((ch) => { try { supabase.removeChannel(ch); } catch { /* noop */ } });
  channels.clear();
  started = false;
}
