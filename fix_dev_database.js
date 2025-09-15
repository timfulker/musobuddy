// Let's construct the proper DATABASE_URL_DEV for Supabase development
console.log('Current environment setup:');
console.log('DATABASE_URL points to:', process.env.DATABASE_URL?.includes('neon') ? 'Neon (old)' : 'Other');
console.log('DATABASE_URL_DEV exists:', !!process.env.DATABASE_URL_DEV);

// The Supabase dev URL should look like:
// postgresql://postgres:[SERVICE_KEY]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

console.log('\n🔧 To fix development database:');
console.log('1. Set DATABASE_URL_DEV to your Supabase development connection string:');
console.log('   postgresql://postgres:[DEV_SERVICE_KEY]@aws-0-us-east-1.pooler.supabase.com:5432/postgres');
console.log('\n2. Restart your app');
console.log('\n3. Development will then use Supabase (6 users) instead of Neon (2 users)');

// Check what credentials are available
const hasSupabaseDev = process.env.SUPABASE_URL_DEV && process.env.SUPABASE_SERVICE_KEY_DEV;
console.log('\nSupabase Dev credentials available:', hasSupabaseDev ? 'Yes' : 'No');

if (hasSupabaseDev) {
  // Extract the Supabase project ID from the URL
  const supabaseUrl = process.env.SUPABASE_URL_DEV;
  const projectMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (projectMatch) {
    const projectId = projectMatch[1];
    console.log(`\nYour Supabase dev project ID: ${projectId}`);
    console.log(`Suggested DATABASE_URL_DEV:`);
    console.log(`postgresql://postgres.[DEV_SERVICE_KEY]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`);
    console.log(`\nReplace [DEV_SERVICE_KEY] with your actual service key`);
  }
}