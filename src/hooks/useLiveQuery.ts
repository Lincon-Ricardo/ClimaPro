import { useEffect, useState, useRef } from 'react';
import { subscribeData } from '../lib/tableBus';
import { isSupabaseConfigured } from '../lib/supabaseClient';

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
    let active = true;

    async function run() {
      const configured = await isSupabaseConfigured();
      if (!configured) {
        if (active) setResult(undefined);
        return;
      }
      try {
        const v = await fnRef.current();
        if (active) setResult(v);
      } catch (error) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return result;
}
