import dotenv from 'dotenv';
dotenv.config();

// Get Supabase dev credentials
const supabaseDevUrl = process.env.SUPABASE_URL_DEV;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_DEV;

if (!supabaseDevUrl || !serviceKey) {
  console.error('❌ Missing Supabase dev credentials');
  process.exit(1);
}

// Extract project ID from Supabase URL
const projectMatch = supabaseDevUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
if (!projectMatch) {
  console.error('❌ Could not extract project ID from Supabase URL');
  process.exit(1);
}

const projectId = projectMatch[1];

// Construct DATABASE_URL_DEV for Supabase
const databaseUrlDev = `postgresql://postgres.${projectId}:${serviceKey}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;

console.log('🔧 Setting up development database connection to Supabase...');
console.log(`   Project ID: ${projectId}`);
console.log(`   Connection will use pooler for IPv4 compatibility`);

// Write to .env file
import { writeFileSync, readFileSync } from 'fs';

try {
  let envContent = '';
  try {
    envContent = readFileSync('.env', 'utf8');
  } catch (e) {
    console.log('📝 Creating new .env file...');
  }

  // Remove existing DATABASE_URL_DEV line if present
  const lines = envContent.split('\n').filter(line => !line.startsWith('DATABASE_URL_DEV='));
  
  // Add new DATABASE_URL_DEV
  lines.push(`DATABASE_URL_DEV=${databaseUrlDev}`);
  
  // Write back
  writeFileSync('.env', lines.join('\n'));
  
  console.log('✅ DATABASE_URL_DEV added to .env file');
  console.log('🔄 Restart your application to use Supabase development database');
  console.log('📊 Development will now have the same 6 users as production');
  
} catch (error) {
  console.error('❌ Error updating .env file:', error);
}