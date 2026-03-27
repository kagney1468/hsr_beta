import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  console.error(
    '[HomeSalesReady] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth cannot work. Check your .env and Vite env prefix.'
  );
}

/**
 * Implicit flow is used so magic links work when email clients open them in a
 * different browser context (where the PKCE code_verifier stored in localStorage
 * is unavailable, causing "pkce_code_verifier_not_found").
 *
 * With implicit flow Supabase delivers the session via the URL hash:
 *   /auth/callback#access_token=...&refresh_token=...
 * `detectSessionInUrl: true` processes this automatically; AuthCallback also
 * handles it explicitly as a fallback.
 */
export const supabase = createClient<Database>(supabaseUrl || '', supabaseAnonKey || '', {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
});
