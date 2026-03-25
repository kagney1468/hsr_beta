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
 * Email magic links return tokens in the URL hash; implicit flow matches that behaviour.
 * PKCE (code in query) can fail to complete session exchange for OTP email links in some setups.
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
