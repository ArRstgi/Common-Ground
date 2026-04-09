import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not set. ' +
    'Add them to your .env file.'
  );
}

/**
 * Returns a Supabase client with the current user's JWT injected as the
 * Authorization header, so RLS policies that check auth.uid() work correctly.
 * Call this inside fetch functions (not at module level) so it always reads
 * the latest token from sessionStorage.
 */
export function getClient() {
  const token = sessionStorage.getItem('cg_token');
  return createClient(SUPABASE_URL ?? '', SUPABASE_ANON ?? '', {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
