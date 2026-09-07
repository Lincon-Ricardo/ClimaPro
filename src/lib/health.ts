import { supabase, isSupabaseConfiguredSync } from './supabaseClient';
import { getRealtimeStatus, type RealtimeStatus } from './realtime';

export type HealthState = 'ok' | 'warn' | 'error' | 'checking';

export interface HealthResult {
  key: string;
  label: string;
  state: HealthState;
  detail: string;
  ms?: number;
}

function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t0 = performance.now();
  return fn().then((value) => ({ value, ms: Math.round(performance.now() - t0) }));
}

export function realtimeResult(s: RealtimeStatus): HealthResult {
  if (s === 'on') return { key: 'realtime', label: 'Tempo real', state: 'ok', detail: 'Canal ativo' };
  if (s === 'connecting') return { key: 'realtime', label: 'Tempo real', state: 'checking', detail: 'Conectando...' };
  if (s === 'error') return { key: 'realtime', label: 'Tempo real', state: 'error', detail: 'Falhou — ative publication' };
  return { key: 'realtime', label: 'Tempo real', state: 'warn', detail: 'Inativo nesta sessão' };
}

export async function checkBackend(): Promise<HealthResult> {
  if (!isSupabaseConfiguredSync()) {
    return { key: 'backend', label: 'Backend', state: 'error', detail: 'Sem VITE_SUPABASE_*' };
  }
  try {
    const { value, ms } = await timed(() => supabase.auth.getSession());
    if (value.error) return { key: 'backend', label: 'Backend', state: 'error', detail: value.error.message.slice(0, 80), ms };
    if (!value.data.session) return { key: 'backend', label: 'Backend', state: 'warn', detail: 'Sem sessão ativa', ms };
    return { key: 'backend', label: 'Backend', state: 'ok', detail: 'Sessão válida', ms };
  } catch (e) {
    return { key: 'backend', label: 'Backend', state: 'error', detail: String((e as Error)?.message || e).slice(0, 80) };
  }
}

export async function checkDatabase(): Promise<HealthResult> {
  if (!isSupabaseConfiguredSync()) {
    return { key: 'database', label: 'Banco', state: 'error', detail: 'Não configurado' };
  }
  try {
    const { ms } = await timed(async () => {
      const { error } = await supabase.from('companies').select('id', { count: 'exact', head: true });
      if (error) throw error;
    });
    return { key: 'database', label: 'Banco', state: 'ok', detail: 'RLS respondendo', ms };
  } catch (e) {
    const msg = String((e as { message?: string })?.message || e);
    return { key: 'database', label: 'Banco', state: 'error', detail: msg.slice(0, 90) };
  }
}

export async function checkStorage(): Promise<HealthResult> {
  if (!isSupabaseConfiguredSync()) {
    return { key: 'storage', label: 'Fotos', state: 'error', detail: 'Não configurado' };
  }
  try {
    const { ms } = await timed(async () => {
      const { error } = await supabase.storage.from('service-photos').list('', { limit: 1 });
      if (error) throw error;
    });
    return { key: 'storage', label: 'Fotos', state: 'ok', detail: 'Bucket privado OK', ms };
  } catch (e) {
    const msg = String((e as { message?: string })?.message || e);
    if (/bucket|not found|does not exist/i.test(msg)) {
      return { key: 'storage', label: 'Fotos', state: 'error', detail: 'Bucket service-photos ausente' };
    }
    return { key: 'storage', label: 'Fotos', state: 'warn', detail: msg.slice(0, 90) };
  }
}

export async function runHealthChecks(): Promise<HealthResult[]> {
  const [backend, database, storage] = await Promise.all([checkBackend(), checkDatabase(), checkStorage()]);
  return [backend, database, storage, realtimeResult(getRealtimeStatus())];
}
