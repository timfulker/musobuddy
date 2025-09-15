import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

// Build Supabase connection string for production
const supabaseUrl = process.env.SUPABASE_URL_PROD;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_PROD;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase prod credentials');
  process.exit(1);
}

const projectMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
if (!projectMatch) {
  console.error('❌ Could not extract project ID from Supabase URL');
  process.exit(1);
}

const projectId = projectMatch[1];
const connectionString = `postgresql://postgres.${projectId}:${serviceKey}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;

const sql = neon(connectionString);

async function listUsers() {
  try {
    console.log('🔍 Current users in database:');
    
    const users = await sql`SELECT id, email, first_name, last_name FROM users ORDER BY email`;
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.first_name} ${user.last_name}) [ID: ${user.id}]`);
    });
    
    console.log(`\nTotal: ${users.length} users`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listUsers();