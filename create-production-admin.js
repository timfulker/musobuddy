/**
 * Create Production Admin Account
 * This script creates an admin account in the PRODUCTION Supabase database
 * for timmfulkermusic@gmail.com
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

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
const ADMIN_PASSWORD = 'SecurePassword123!'; // You should change this immediately after first login
const ADMIN_FIRST_NAME = 'Tim';
const ADMIN_LAST_NAME = 'Fulker';

async function createProductionAdmin() {
  try {
    console.log('\n📧 Creating admin account for:', ADMIN_EMAIL);
    console.log('⚠️  PRODUCTION DATABASE - This is your live environment!');

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
    console.log('🎉 PRODUCTION ADMIN ACCOUNT READY!');
    console.log('='.repeat(60));
    console.log('\n📋 Login Credentials:');
    console.log('   Email:', ADMIN_EMAIL);
    console.log('   Password:', ADMIN_PASSWORD);
    console.log('\n⚠️  IMPORTANT: Change this password immediately after first login!');
    console.log('\n🌐 Production URL: https://your-production-domain.com');
    console.log('   (Replace with your actual production domain)');
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

// Run the script
createProductionAdmin();