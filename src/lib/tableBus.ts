type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function emitDataChanged(table: string) {
  listeners.get(table)?.forEach((fn) => fn());
  listeners.get('*')?.forEach((fn) => fn());
}

export function subscribeData(table: string, fn: Listener): () => void {
  let set = listeners.get(table);
  if (!set) {
    set = new Set();
    listeners.set(table, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
  };
}
