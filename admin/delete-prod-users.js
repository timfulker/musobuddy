// Simple script to delete users from production using app's database connection
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { users } from "../shared/schema.ts";
import { eq } from "drizzle-orm";
import dotenv from 'dotenv';

dotenv.config();

// Build connection string exactly like the main app does
function buildSupabaseConnectionString(supabaseUrl, serviceKey) {
  const projectMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!projectMatch) {
    throw new Error('Invalid Supabase URL format');
  }
  const projectId = projectMatch[1];
  return `postgresql://postgres.${projectId}:${serviceKey}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;
}

// Production connection
const supabaseUrl = process.env.SUPABASE_URL_PROD;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_PROD;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing production Supabase credentials');
  process.exit(1);
}

const connectionString = buildSupabaseConnectionString(supabaseUrl, serviceKey);
const sql = neon(connectionString);
const db = drizzle(sql);

async function listAndDeleteUsers() {
  try {
    console.log('🔍 Checking production users...');
    
    // List all users
    const allUsers = await db.select().from(users);
    
    console.log('\nCurrent users in production:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.firstName} ${user.lastName}) [ID: ${user.id}]`);
    });
    
    // Users to keep
    const keepEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com'];
    
    const usersToDelete = allUsers.filter(user => !keepEmails.includes(user.email));
    
    if (usersToDelete.length === 0) {
      console.log('\n✅ Only the users you want to keep are present.');
      return;
    }
    
    console.log(`\n🗑️  Will delete ${usersToDelete.length} user(s):`);
    usersToDelete.forEach(user => console.log(`   - ${user.email}`));
    
    // Delete them
    for (const user of usersToDelete) {
      console.log(`   Deleting: ${user.email}...`);
      
      try {
        await db.delete(users).where(eq(users.id, user.id));
        console.log(`   ✅ Deleted ${user.email}`);
      } catch (error) {
        console.log(`   ❌ Error deleting ${user.email}:`, error.message);
      }
    }
    
    console.log('\n🎉 Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listAndDeleteUsers();