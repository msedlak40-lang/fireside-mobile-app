import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
// NEW: fallback to app.json so extra is always available in Dev Client
import appConfig from '../../app.json';

const extra =
  (Constants.expoConfig?.extra || (Constants as any).manifest?.extra || appConfig?.expo?.extra || {}) as {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  };

if (!extra.supabaseUrl || !extra.supabaseAnonKey) {
  // Helpful console message so we know *which* value is missing
  console.warn('[Supabase] Missing config:',
    { supabaseUrl: !!extra.supabaseUrl, supabaseAnonKey: !!extra.supabaseAnonKey });
}

export const supabase = createClient(extra.supabaseUrl!, extra.supabaseAnonKey!, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
});
