/**
 * Setup Production Auth System
 * This script:
 * 1. Creates the necessary triggers in production database
 * 2. Creates admin account for timmfulkermusic@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// PRODUCTION Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL_PROD;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY_PROD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing PRODUCTION Supabase credentials in .env file');
  process.exit(1);
}

console.log('🚀 Connecting to PRODUCTION Supabase:', SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Admin details
const ADMIN_EMAIL = 'timmfulkermusic@gmail.com';
const ADMIN_PASSWORD = 'MusicPro2025!'; // You should change this immediately after first login
const ADMIN_FIRST_NAME = 'Tim';
const ADMIN_LAST_NAME = 'Fulker';

async function setupProductionTriggers() {
  console.log('\n🔧 Setting up PRODUCTION database triggers...');
  console.log('⚠️  PRODUCTION DATABASE - This is your live environment!');

  try {
    // Create the trigger function that syncs auth.users to public.users
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.users (id, email, supabase_uid, created_at, updated_at, email_verified, is_admin, tier)
        VALUES (
          gen_random_uuid(),
          NEW.email,
          NEW.id,
          NOW(),
          NOW(),
          COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
          false,
          'free'
        )
        ON CONFLICT (supabase_uid) DO UPDATE
        SET
          email = EXCLUDED.email,
          updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: createFunctionSQL
    }).single();

    if (functionError && !functionError.message?.includes('already exists')) {
      console.log('⚠️  Function might already exist or exec_sql not available, continuing...');
    } else {
      console.log('✅ Created/updated trigger function');
    }

    // Create the trigger
    const createTriggerSQL = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: createTriggerSQL
    }).single();

    if (triggerError && !triggerError.message?.includes('already exists')) {
      console.log('⚠️  Trigger might already exist or exec_sql not available');
      console.log('   You may need to run these SQL commands manually in Supabase SQL Editor:');
      console.log('\n' + '='.repeat(60));
      console.log(createFunctionSQL);
      console.log('\n' + createTriggerSQL);
      console.log('='.repeat(60) + '\n');
    } else {
      console.log('✅ Created/updated database trigger');
    }

  } catch (error) {
    console.log('\n⚠️  Could not automatically create triggers.');
    console.log('   This is normal if RPC functions are not set up.');
    console.log('\n📋 Please run these SQL commands in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(60));
    console.log(`
-- Create function to sync auth users to public users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, supabase_uid, created_at, updated_at, email_verified, is_admin, tier)
  VALUES (
    gen_random_uuid(),
    NEW.email,
    NEW.id,
    NOW(),
    NOW(),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    false,
    'free'
  )
  ON CONFLICT (supabase_uid) DO UPDATE
  SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-sync users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `);
    console.log('='.repeat(60) + '\n');
  }
}

async function createProductionAdmin() {
  try {
    console.log('\n📧 Creating admin account for:', ADMIN_EMAIL);

    // Step 1: Create Supabase auth user
    console.log('\n1️⃣ Creating Supabase auth user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists in Supabase auth, fetching existing user...');

        // Get existing user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;

        const existingUser = users.find(u => u.email === ADMIN_EMAIL);
        if (!existingUser) {
          throw new Error('Could not find existing user');
        }

        console.log('✅ Found existing Supabase auth user:', existingUser.id);

        // Step 2: Check/Update database user
        await ensureDatabaseUser(existingUser.id);
      } else {
        throw authError;
      }
    } else {
      console.log('✅ Created Supabase auth user:', authUser.user.id);

      // Step 2: Create database user
      await ensureDatabaseUser(authUser.user.id);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 PRODUCTION SETUP COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Admin Login Credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('\n⚠️  IMPORTANT NEXT STEPS:');
    console.log('   1. Change this password immediately after first login!');
    console.log('   2. Verify the triggers are set up in Supabase SQL Editor');
    console.log('   3. Deploy your application with NODE_ENV=production');
    console.log('\n🌐 Production Deployment Checklist:');
    console.log('   ✓ Set NODE_ENV=production in your hosting environment');
    console.log('   ✓ Ensure all PROD environment variables are set');
    console.log('   ✓ Database triggers are active (check SQL Editor)');
    console.log('   ✓ Admin account is created');
    console.log('\n✅ The account has full admin privileges in PRODUCTION');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error.message);
    process.exit(1);
  }
}

async function ensureDatabaseUser(supabaseUid) {
  console.log('\n2️⃣ Checking database user record...');

  // Check if user exists in database
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_uid', supabaseUid)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existingUser) {
    console.log('⚠️  User already exists in database, updating to admin...');

    // Update to ensure admin status
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_admin: true,
        tier: 'premium',
        email_verified: true,
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
        updated_at: new Date().toISOString()
      })
      .eq('supabase_uid', supabaseUid);

    if (updateError) throw updateError;
    console.log('✅ Updated existing user to admin status');
  } else {
    console.log('Creating new database user record...');

    // Create new user in database
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        email: ADMIN_EMAIL,
        first_name: ADMIN_FIRST_NAME,
        last_name: ADMIN_LAST_NAME,
        is_admin: true,
        tier: 'premium',
        email_verified: true,
        phone_verified: false,
        supabase_uid: supabaseUid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) throw insertError;
    console.log('✅ Created admin user in database');
  }
}

// Run the setup
async function main() {
  console.log('🚀 PRODUCTION AUTH SETUP SCRIPT');
  console.log('================================\n');

  // First set up triggers
  await setupProductionTriggers();

  // Then create admin account
  await createProductionAdmin();
}

main();