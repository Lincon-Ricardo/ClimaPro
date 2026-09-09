const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, max = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count++;
  if (entry.count > max) return false;
  return true;
}

export function clientKey(request: { headers?: unknown; socket?: { remoteAddress?: string } }, suffix = ''): string {
  const h = (request.headers || {}) as Record<string, string | string[] | undefined>;
  const fwd = h['x-forwarded-for'];
  const ip = Array.isArray(fwd) ? fwd[0] : (fwd || request.socket?.remoteAddress || 'unknown');
  return `${ip}${suffix}`;
}
