// Migration script to create Supabase Auth users for existing custom users
// This solves the "Invalid login credentials" issue by creating auth.users entries

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

// Users from supabase-users-data.sql that need to be migrated
const existingUsers = [
  {
    id: '43963086',
    email: 'timfulker@gmail.com',
    firstName: 'Tim',
    lastName: 'Fulker'
  },
  {
    id: '1754488522516',
    email: 'timfulkermusic@gmail.com',
    firstName: 'Tim',
    lastName: 'Fulker'
  },
  {
    id: '48aYuutOsCdh4-1cCtOR3',
    email: 'timfulkeramazon+test@gmail.com',
    firstName: 'Bob',
    lastName: 'Bob'
  },
  {
    id: '999999',
    email: 'jake.stanley@musobuddy.com',
    firstName: 'Jake',
    lastName: 'Stanley'
  },
  {
    id: '8FEV4ncSe5od5MaRYk66l',
    email: 'info@groovemeister.co.uk',
    firstName: 'Tim',
    lastName: 'Fulker'
  }
];

// Default password for migrated users (they can reset it later)
const DEFAULT_PASSWORD = 'TempPass123!';

async function migrateUsersToSupabaseAuth() {
  console.log('🚀 Starting user migration to Supabase Auth...\n');

  // First, get existing Supabase Auth users to avoid duplicates
  console.log('🔍 Checking existing Supabase Auth users...');
  const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error('❌ Failed to list existing users:', listError.message);
    return;
  }

  const existingEmails = new Set(authUsers.users.map(u => u.email));
  console.log(`📊 Found ${existingEmails.size} existing auth users\n`);

  for (const user of existingUsers) {
    console.log(`👤 Processing ${user.email}...`);

    // Skip if user already exists in Supabase Auth
    if (existingEmails.has(user.email)) {
      console.log(`   ⏭️  User already exists in Supabase Auth, skipping\n`);
      continue;
    }

    try {
      // Create user in Supabase Auth
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true, // Auto-confirm to avoid email verification
        user_metadata: {
          firstName: user.firstName,
          lastName: user.lastName,
          migrated: true,
          originalUserId: user.id
        }
      });

      if (createError) {
        console.error(`   ❌ Failed to create auth user: ${createError.message}\n`);
        continue;
      }

      console.log(`   ✅ Created Supabase Auth user with ID: ${authData.user.id}`);

      // Update the custom users table with the Supabase UID
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ supabase_uid: authData.user.id })
        .eq('id', user.id);

      if (updateError) {
        console.error(`   ⚠️  Created auth user but failed to update custom users table: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated custom users table with Supabase UID`);
      }

      console.log(`   🔑 Temporary password: ${DEFAULT_PASSWORD}`);
      console.log(`   💡 User should reset password on first login\n`);

    } catch (error) {
      console.error(`   ❌ Unexpected error: ${error.message}\n`);
    }
  }

  console.log('🎉 Migration completed!\n');

  // Test login with the problematic user
  console.log('🧪 Testing login with timfulkermusic@gmail.com...');

  const supabaseClient = createClient(
    process.env.SUPABASE_URL_DEV,
    process.env.SUPABASE_ANON_KEY_DEV
  );

  const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
    email: 'timfulkermusic@gmail.com',
    password: DEFAULT_PASSWORD
  });

  if (loginError) {
    console.log('❌ Login test failed:', loginError.message);
  } else {
    console.log('✅ Login test successful!');
    console.log(`   📧 Email: ${loginData.user.email}`);
    console.log(`   🆔 Supabase UID: ${loginData.user.id}`);

    // Sign out after test
    await supabaseClient.auth.signOut();
    console.log('🚪 Signed out after test');
  }

  console.log('\n📋 Post-Migration Instructions:');
  console.log('1. All migrated users can now log in with their email');
  console.log(`2. Temporary password is: ${DEFAULT_PASSWORD}`);
  console.log('3. Users should be prompted to reset their password');
  console.log('4. The custom users table now has supabase_uid populated');
  console.log('5. Row Level Security policies will now work correctly');
}

migrateUsersToSupabaseAuth().catch(console.error);