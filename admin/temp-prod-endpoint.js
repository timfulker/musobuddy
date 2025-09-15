// Temporary script to add a production user cleanup endpoint
import express from 'express';
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../shared/schema.ts";
import { eq } from "drizzle-orm";
import dotenv from 'dotenv';

dotenv.config();

// Force production connection
const supabaseUrl = process.env.SUPABASE_URL_PROD;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_PROD;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing production credentials');
  process.exit(1);
}

function buildSupabaseConnectionString(supabaseUrl, serviceKey) {
  const projectMatch = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  if (!projectMatch) {
    throw new Error('Invalid Supabase URL format');
  }
  const projectId = projectMatch[1];
  return `postgresql://postgres.${projectId}:${serviceKey}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`;
}

const connectionString = buildSupabaseConnectionString(supabaseUrl, serviceKey);

// Try different SSL configurations
const pool1 = new Pool({
  connectionString,
  ssl: false,  // Try without SSL first
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

const pool2 = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },  // Try with SSL but not strict
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

const pool3 = new Pool({
  connectionString: connectionString.replace('?sslmode=require', ''),  // Try without sslmode
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

async function tryConnection(pool, name) {
  console.log(`🔄 Trying connection: ${name}`);
  try {
    const db = drizzle(pool);
    const result = await db.select().from(users);
    console.log(`✅ ${name} worked! Found ${result.length} users`);
    
    // List users
    result.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.firstName} ${user.lastName}) [ID: ${user.id}]`);
    });
    
    // Delete users (keep only the two we want)
    const keepEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com'];
    const toDelete = result.filter(user => !keepEmails.includes(user.email));
    
    if (toDelete.length > 0) {
      console.log(`\n🗑️ Deleting ${toDelete.length} users...`);
      for (const user of toDelete) {
        console.log(`   Deleting: ${user.email}`);
        await db.delete(users).where(eq(users.id, user.id));
        console.log(`   ✅ Deleted ${user.email}`);
      }
      console.log('\n🎉 Cleanup complete!');
    } else {
      console.log('\n✅ No users to delete - only the correct ones remain.');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ${name} failed:`, error.message);
    return false;
  }
}

async function cleanup() {
  const pools = [
    [pool1, "No SSL"],
    [pool2, "SSL no reject"],  
    [pool3, "No sslmode param"]
  ];
  
  for (const [pool, name] of pools) {
    if (await tryConnection(pool, name)) {
      process.exit(0);
    }
  }
  
  console.log('❌ All connection methods failed');
}

cleanup();