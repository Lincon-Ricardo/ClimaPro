import { useEffect, useState, useRef } from 'react';
import { subscribeData } from '../lib/tableBus';
import { startRealtime } from '../lib/realtime';
import { isSupabaseConfiguredSync } from '../lib/supabaseClient';

export function useLiveQuery<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  tables: string | string[] = '*',
): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  useEffect(() => {
    startRealtime();
    let active = true;

    async function run() {
      if (!isSupabaseConfiguredSync()) {
        if (active) setResult(undefined);
        return;
      }
      try {
        const v = await fnRef.current();
        if (active) setResult(v);
      } catch (error) {
        if (active) setResult(undefined);
        console.error('[useLiveQuery] consulta falhou', error);
      }
    }

    run();
    const list = Array.isArray(tablesRef.current) ? tablesRef.current : [tablesRef.current];
    const unsubs = list.map((t) => subscribeData(t, run));
    return () => {
      active = false;
      unsubs.forEach((u) => u());
    };
    // deps intencionalmente dinâmico (query por período)
  }, deps);

  return result;
}
