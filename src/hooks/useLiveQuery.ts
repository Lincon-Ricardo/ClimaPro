import { useEffect, useState, useRef } from 'react';
import { subscribeData } from '../lib/tableBus';
import { isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * useLiveQuery compatível com dexie-react-hooks.
 * Executa a thunk e re-executa quando qualquer tabela muda ou deps mudam.
 */
export function useLiveQuery<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
): T | undefined {
  const [result, setResult] = useState<T | undefined>(undefined);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let active = true;

    async function run() {
      setResult(undefined);
      const configured = await isSupabaseConfigured();
      if (!configured) {
        if (active) setResult(undefined);
        return;
      }
      try {
        const v = await fnRef.current();
        if (active) setResult(v);
      } catch {
        if (active) setResult(undefined);
      }
    }

    run();
    const unsub = subscribeData('*', run);
    return () => {
      active = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return result;
}
