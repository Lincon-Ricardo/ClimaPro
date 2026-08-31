type Listener = () => void;

const listeners = new Map<string, Set<Listener>>();

export function emitDataChanged(table: string) {
  const set = listeners.get(table);
  set?.forEach((fn) => fn());
  const all = listeners.get('*');
  all?.forEach((fn) => fn());
  if (table !== 'auth') {
    listeners.get('auth')?.forEach((fn) => fn());
  }
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
