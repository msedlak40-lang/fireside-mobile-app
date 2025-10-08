// mobile/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 👇 Put your real values here (for now). Later we can wire this to app.json/expo config.
const SUPABASE_URL = 'https://ryzgtpexapmwugbdspjm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5emd0cGV4YXBtd3VnYmRzcGptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNTU3NDgsImV4cCI6MjA3MDkzMTc0OH0.qmTlUMEhupcVd9LlHKzVuNh7cj3s5T0fhzwYOiv6Omk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN has no URL bar
  },
});
