import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

export function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server-side não configurado.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export function getBearerToken(request: VercelRequest) {
  const header = typeof request.headers.authorization === 'string' ? request.headers.authorization : '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}
