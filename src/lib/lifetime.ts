export const VITALICIO_USER_ID = '030f83c9-dd5b-46bd-ac2a-aef1bd75e00c';

export const VITALICIO_EMAILS = ['dns_wil@yahoo.com.br'];

export const LIFETIME_PRICE = 697;

export const LIFETIME_LABEL = 'Pioneiro Vitalício';

export function isVitalicioUser(user?: { id?: string; email?: string } | null): boolean {
  if (!user) return false;
  if (user.id && user.id === VITALICIO_USER_ID) return true;
  const email = (user.email || '').trim().toLowerCase();
  return VITALICIO_EMAILS.includes(email);
}

export function isLifetimeSub(sub?: { plan?: string; status?: string } | null): boolean {
  if (!sub) return false;
  return sub.plan === 'lifetime' || sub.status === 'lifetime';
}
