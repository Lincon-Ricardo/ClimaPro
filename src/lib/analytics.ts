const KEY = 'climapro-analytics';

export interface FunnelEvent {
  event: string;
  at: string;
  plan?: string;
  cycle?: string;
  method?: string;
}

function read(): FunnelEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function track(event: string, extra?: { plan?: string; cycle?: string; method?: string }) {
  try {
    const list = read();
    list.push({ event, at: new Date().toISOString(), ...extra });
    localStorage.setItem(KEY, JSON.stringify(list.slice(-500)));
  } catch { /* analytics local nunca quebra o app */ }
}

export function funnelStats() {
  const list = read();
  const count = (e: string) => list.filter((x) => x.event === e).length;
  const signup = count('signup');
  const firstOs = count('first_os');
  const checkout = count('checkout_start');
  const paid = count('checkout_paid');
  return {
    signup, firstOs, checkout, paid,
    activation: signup ? Math.round((firstOs / signup) * 100) : 0,
    checkoutRate: firstOs ? Math.round((checkout / firstOs) * 100) : 0,
    paidRate: checkout ? Math.round((paid / checkout) * 100) : 0,
    events: list.slice(-50).reverse(),
  };
}
