import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || Constants.manifest?.extra) as any;

export const supabase = createClient(
  extra?.supabaseUrl,
  extra?.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // we handle deep links manually
    },
  }
);
