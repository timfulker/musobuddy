/**
 * Fix Production User Script
 * This connects directly to your production database and fixes the user
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Production Supabase configuration
const SUPABASE_URL = 'https://dknmckqaraedpimxdsqq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY_PROD;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY_PROD in .env file');
  process.exit(1);
}

console.log('🚀 Connecting to PRODUCTION Supabase:', SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ADMIN_EMAIL = 'timmfulkermusic@gmail.com';

async function fixProductionUser() {
  try {
    console.log('\n🔍 Step 1: Finding auth user...');

    // Get the auth user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const authUser = users.find(u => u.email === ADMIN_EMAIL);
    if (!authUser) {
      console.log('❌ No auth user found. Creating one...');

      // Create the auth user
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: 'MusicPro2025!',
        email_confirm: true
      });

      if (createError) throw createError;
      console.log('✅ Created auth user:', newAuthUser.user.id);

      await ensureDatabaseUser(newAuthUser.user.id);
    } else {
      console.log('✅ Found auth user:', authUser.id);
      await ensureDatabaseUser(authUser.id);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

async function ensureDatabaseUser(supabaseUid) {
  console.log('\n🔍 Step 2: Checking database user...');

  // Check if user exists in database
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existingUser) {
    console.log('⚠️  Database user exists, updating...');

    // Update existing user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        supabase_uid: supabaseUid,
        is_admin: true,
        tier: 'premium',
        email_verified: true,
        first_name: 'Tim',
        last_name: 'Fulker',
        updated_at: new Date().toISOString()
      })
      .eq('email', ADMIN_EMAIL);

    if (updateError) throw updateError;
    console.log('✅ Updated database user');
  } else {
    console.log('Creating new database user...');

    // Create new user
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        email: ADMIN_EMAIL,
        supabase_uid: supabaseUid,
        first_name: 'Tim',
        last_name: 'Fulker',
        is_admin: true,
        tier: 'premium',
        email_verified: true,
        phone_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) throw insertError;
    console.log('✅ Created database user');
  }

  // Verify the fix
  console.log('\n🔍 Step 3: Verifying fix...');
  const { data: verifyUser, error: verifyError } = await supabase
    .from('users')
    .select('id, email, supabase_uid, is_admin, tier')
    .eq('email', ADMIN_EMAIL)
    .single();

  if (verifyError) throw verifyError;

  console.log('\n' + '='.repeat(60));
  console.log('🎉 PRODUCTION USER FIXED!');
  console.log('='.repeat(60));
  console.log('\n📋 User Details:');
  console.log('   Email:', verifyUser.email);
  console.log('   Supabase UID:', verifyUser.supabase_uid);
  console.log('   Admin:', verifyUser.is_admin);
  console.log('   Tier:', verifyUser.tier);
  console.log('\n📋 Login Credentials:');
  console.log('   Email:', ADMIN_EMAIL);
  console.log('   Password: MusicPro2025!');
  console.log('\n✅ Try logging in now at https://www.musobuddy.com');
  console.log('='.repeat(60));
}

// Run the fix
fixProductionUser();