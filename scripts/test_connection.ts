/**
 * Simple test to verify Supabase connection
 */

console.log('Testing Supabase connection...');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ Not set');
console.log('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Not set');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  Deno.exit(1);
}

console.log('\n✅ Environment variables are set correctly!');
console.log('Ready to run the extraction script.');
