import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

async function createMissingUser() {
  // Use development database
  const connectionString = process.env.DATABASE_URL_DEV ||
    'postgresql://postgres:dbp8vugbuk9PKBbjn@aws-0-us-east-1.pooler.supabase.com:5432/postgres?options=project%3Dwkhrzcpvghdlhnxzhrde';

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const db = drizzle(pool);

  try {
    // User details from the problem synopsis
    const supabaseUid = '081b3786-a8b4-41fc-87b9-d1f1bd6db11c';
    const email = 'timfulkermusic@gmail.com';

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.supabaseUid, supabaseUid)).limit(1);

    if (existingUser.length > 0) {
      console.log('✅ User already exists in database:', existingUser[0]);
      return;
    }

    // Create the user
    const newUser = await db.insert(users).values({
      supabaseUid,
      email,
      username: email.split('@')[0], // Use email prefix as username
      tier: 'free', // Start with free tier
      createdAt: new Date(),
      updatedAt: new Date(),
      isAdmin: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      emailVerified: true, // Since they logged in via Supabase
      stripeConnectedAccountId: null,
      paymentMethodId: null
    }).returning();

    console.log('✅ User created successfully:', newUser[0]);
  } catch (error) {
    console.error('❌ Error creating user:', error);
  } finally {
    await pool.end();
  }
}

createMissingUser();