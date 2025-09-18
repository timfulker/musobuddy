/**
 * Create CORRECT Production User
 * Email: timfulkermusic@gmail.com (single 'm')
 * Instance: dknmckqaraedpimxdsqq (production)
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// PRODUCTION Supabase configuration (dknmckqaraedpimxdsqq)
const SUPABASE_URL = 'https://dknmckqaraedpimxdsqq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY_PROD;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY_PROD in .env file');
  process.exit(1);
}

console.log('🚀 Connecting to PRODUCTION Supabase:', SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ADMIN_EMAIL = 'timfulkermusic@gmail.com'; // CORRECT email with single 'm'
const ADMIN_PASSWORD = 'MusicPro2025!';

async function createProductionUser() {
  try {
    console.log('\n📧 Creating admin account for:', ADMIN_EMAIL);
    console.log('⚠️  PRODUCTION DATABASE');

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
        await ensureDatabaseUser(existingUser.id);
      } else {
        throw authError;
      }
    } else {
      console.log('✅ Created Supabase auth user:', authUser.user.id);
      await ensureDatabaseUser(authUser.user.id);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 PRODUCTION USER READY!');
    console.log('='.repeat(60));
    console.log('\n📋 Login Credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('\n⚠️  IMPORTANT: This is for PRODUCTION environment');
    console.log('   Make sure NODE_ENV=production when you deploy');
    console.log('\n✅ The user has admin privileges in PRODUCTION');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Error creating admin account:', error.message);
    process.exit(1);
  }
}

async function ensureDatabaseUser(supabaseUid) {
  console.log('\n2️⃣ Creating database user record...');

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
    console.log('⚠️  User already exists in database, updating...');

    // Update to ensure admin status
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
    console.log('✅ Updated existing user to admin status');
  } else {
    console.log('Creating new database user record...');

    // Create new user in database
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: crypto.randomUUID(),
        email: ADMIN_EMAIL,
        first_name: 'Tim',
        last_name: 'Fulker',
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

// Run the script
createProductionUser();