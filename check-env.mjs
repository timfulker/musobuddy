// Check if environment variables are loaded correctly
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file
dotenv.config({ path: join(__dirname, '.env') });

console.log('=== Environment Variables Check ===\n');

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REPLIT_ENVIRONMENT:', process.env.REPLIT_ENVIRONMENT);

console.log('\nSupabase DEV vars:');
console.log('- SUPABASE_URL_DEV:', process.env.SUPABASE_URL_DEV ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_KEY_DEV:', process.env.SUPABASE_SERVICE_KEY_DEV ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_ANON_KEY_DEV:', process.env.SUPABASE_ANON_KEY_DEV ? '✅ Set' : '❌ Missing');

console.log('\nSupabase PROD vars:');
console.log('- SUPABASE_URL_PROD:', process.env.SUPABASE_URL_PROD ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_KEY_PROD:', process.env.SUPABASE_SERVICE_KEY_PROD ? '✅ Set' : '❌ Missing');

console.log('\nDerived values:');
const isDevelopment = process.env.NODE_ENV !== 'production';
console.log('- isDevelopment:', isDevelopment);

const supabaseUrl = isDevelopment
  ? process.env.SUPABASE_URL_DEV
  : process.env.SUPABASE_URL_PROD;

const supabaseKey = isDevelopment
  ? process.env.SUPABASE_SERVICE_KEY_DEV
  : process.env.SUPABASE_SERVICE_KEY_PROD;

console.log('- Selected URL:', supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : 'MISSING');
console.log('- Selected Key:', supabaseKey ? '✅ Present' : '❌ MISSING');