import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../shared/schema";
import { eq, or } from "drizzle-orm";

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

async function checkUserExists() {
  // First check what project we're actually pointing to
  console.log('SUPABASE_URL_DEV:', process.env.SUPABASE_URL_DEV);

  // Try Transaction mode pooler (port 6543)
  const connectionString = 'postgresql://postgres.uqfwpvxxrstrixmgaqon:trv-MQG8xjr_tcw0jdt@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

  console.log('🔍 Connecting to database...');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const db = drizzle(pool);

  try {
    // User details from the problem synopsis
    const supabaseUid = '081b3786-a8b4-41fc-87b9-d1f1bd6db11c';
    const email = 'timfulkermusic@gmail.com';

    console.log(`\n🔍 Searching for user with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Supabase UID: ${supabaseUid}`);

    // Check by supabaseUid
    const userByUid = await db.select().from(users).where(eq(users.supabaseUid, supabaseUid)).limit(1);

    // Check by email
    const userByEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);

    console.log('\n📊 Results:');

    if (userByUid.length > 0) {
      console.log('✅ User found by Supabase UID:', {
        id: userByUid[0].id,
        email: userByUid[0].email,
        supabaseUid: userByUid[0].supabaseUid,
        tier: userByUid[0].tier,
        createdAt: userByUid[0].createdAt
      });
    } else {
      console.log('❌ No user found with Supabase UID:', supabaseUid);
    }

    if (userByEmail.length > 0) {
      console.log('✅ User found by email:', {
        id: userByEmail[0].id,
        email: userByEmail[0].email,
        supabaseUid: userByEmail[0].supabaseUid,
        tier: userByEmail[0].tier,
        createdAt: userByEmail[0].createdAt
      });
    } else {
      console.log('❌ No user found with email:', email);
    }

    // Get total user count
    const allUsers = await db.select().from(users);
    console.log(`\n📊 Total users in database: ${allUsers.length}`);

    // Show all users with that email domain
    const domain = '@gmail.com';
    const gmailUsers = allUsers.filter(u => u.email?.includes(domain));
    if (gmailUsers.length > 0) {
      console.log(`\n👥 Gmail users in database:`);
      gmailUsers.forEach(u => {
        console.log(`   - ${u.email} (UID: ${u.supabaseUid || 'none'})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking user:', error);
  } finally {
    await pool.end();
  }
}

checkUserExists();