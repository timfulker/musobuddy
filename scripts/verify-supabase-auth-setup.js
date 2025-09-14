// Verification script to check Supabase authentication setup
// Run this after migration to verify everything is working

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

const supabaseClient = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_ANON_KEY_DEV
);

async function verifySupabaseAuthSetup() {
  console.log('🔍 Verifying Supabase Authentication Setup\n');
  console.log('==========================================\n');

  let totalIssues = 0;

  // 1. Check auth users
  console.log('1️⃣ Checking Supabase Auth Users...');
  const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();

  if (authError) {
    console.log('❌ Failed to fetch auth users:', authError.message);
    totalIssues++;
  } else {
    console.log(`✅ Found ${authUsers.users.length} users in Supabase Auth:`);
    authUsers.users.forEach(user => {
      const metadata = user.user_metadata || {};
      console.log(`   📧 ${user.email} (${metadata.firstName} ${metadata.lastName}) - ${metadata.migrated ? 'MIGRATED' : 'NATIVE'}`);
    });
  }

  console.log();

  // 2. Check custom users table
  console.log('2️⃣ Checking Custom Users Table...');
  const { data: customUsers, error: customError } = await supabaseAdmin
    .from('users')
    .select('id, email, first_name, last_name, supabase_uid')
    .order('email');

  if (customError) {
    console.log('❌ Failed to fetch custom users:', customError.message);
    totalIssues++;
  } else {
    console.log(`✅ Found ${customUsers.length} users in custom users table:`);
    customUsers.forEach(user => {
      const linked = user.supabase_uid ? '✅ LINKED' : '❌ NOT LINKED';
      console.log(`   👤 ${user.email} (${user.first_name} ${user.last_name}) - ${linked}`);
    });
  }

  console.log();

  // 3. Check for orphaned records
  console.log('3️⃣ Checking for Data Consistency Issues...');

  if (!authError && !customError) {
    const authEmails = new Set(authUsers.users.map(u => u.email));
    const customEmails = new Set(customUsers.map(u => u.email));

    // Find auth users without custom records
    const orphanedAuth = authUsers.users.filter(u => !customEmails.has(u.email));
    // Find custom users without auth records
    const orphanedCustom = customUsers.filter(u => !authEmails.has(u.email));
    // Find custom users without supabase_uid
    const unlinkedCustom = customUsers.filter(u => !u.supabase_uid);

    if (orphanedAuth.length > 0) {
      console.log(`⚠️  ${orphanedAuth.length} auth users without custom records:`);
      orphanedAuth.forEach(u => console.log(`     📧 ${u.email}`));
      totalIssues++;
    }

    if (orphanedCustom.length > 0) {
      console.log(`⚠️  ${orphanedCustom.length} custom users without auth records:`);
      orphanedCustom.forEach(u => console.log(`     👤 ${u.email}`));
      totalIssues++;
    }

    if (unlinkedCustom.length > 0) {
      console.log(`⚠️  ${unlinkedCustom.length} custom users without supabase_uid:`);
      unlinkedCustom.forEach(u => console.log(`     🔗 ${u.email}`));
      totalIssues++;
    }

    if (orphanedAuth.length === 0 && orphanedCustom.length === 0 && unlinkedCustom.length === 0) {
      console.log('✅ No consistency issues found');
    }
  }

  console.log();

  // 4. Test authentication flow
  console.log('4️⃣ Testing Authentication Flow...');

  const testUsers = [
    { email: 'timfulkermusic@gmail.com', password: 'TempPass123!' },
    { email: 'test+admin@example.com', password: 'testpass123' }
  ];

  for (const testUser of testUsers) {
    try {
      console.log(`   🔐 Testing login: ${testUser.email}`);

      const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      if (loginError) {
        console.log(`   ❌ Login failed: ${loginError.message}`);
        totalIssues++;
        continue;
      }

      console.log(`   ✅ Login successful`);

      // Test database access
      const { data: userData, error: dataError } = await supabaseClient
        .from('users')
        .select('id, email, first_name, last_name')
        .eq('supabase_uid', loginData.user.id)
        .single();

      if (dataError) {
        console.log(`   ⚠️  Database access failed: ${dataError.message}`);
        totalIssues++;
      } else {
        console.log(`   ✅ Database access successful: ${userData.first_name} ${userData.last_name}`);
      }

      await supabaseClient.auth.signOut();

    } catch (error) {
      console.log(`   ❌ Unexpected error: ${error.message}`);
      totalIssues++;
    }
  }

  console.log();

  // 5. Summary
  console.log('==========================================');
  console.log('📊 VERIFICATION SUMMARY\n');

  if (totalIssues === 0) {
    console.log('🎉 ALL CHECKS PASSED!');
    console.log('✅ Supabase authentication is properly configured');
    console.log('✅ All users are migrated and linked correctly');
    console.log('✅ Authentication flow is working');
    console.log('✅ Database access is functioning');
  } else {
    console.log(`⚠️  FOUND ${totalIssues} ISSUE(S)`);
    console.log('❌ Some problems need to be addressed');
    console.log('📋 Review the issues above and take corrective action');
  }

  console.log('\n📝 Next Steps:');
  console.log('1. If all checks passed, authentication is ready');
  console.log('2. Consider sending password reset emails to migrated users');
  console.log('3. Implement password reset flow in your frontend');
  console.log('4. Monitor authentication logs for any issues');

  return totalIssues === 0;
}

verifySupabaseAuthSetup().catch(console.error);