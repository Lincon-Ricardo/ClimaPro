import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

export function isSupabaseConfiguredSync() {
  return Boolean(rawUrl && rawKey && rawUrl.startsWith('https://'));
}

export async function isSupabaseConfigured() {
  return isSupabaseConfiguredSync();
}

function getClient(): SupabaseClient {
  if (isSupabaseConfiguredSync()) return createClient(rawUrl, rawKey);
  return createClient('https://placeholder.supabase.co', 'placeholder-anon-key');
}

export const supabase: SupabaseClient = getClient();
