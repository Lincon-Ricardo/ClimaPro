export function errMsg(e: unknown, fallback = 'Tente novamente.'): string {
  if (e instanceof Error) return e.message || fallback;
  if (typeof e === 'string' && e) return e;
  const m = (e as { message?: unknown } | null)?.message;
  return typeof m === 'string' && m ? m : fallback;
}
