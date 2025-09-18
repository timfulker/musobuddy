// Quick script to check user status in both Supabase Auth and main database
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function checkUserStatus() {
  console.log('🔍 Checking user status for timfulker@gmail.com...\n');

  try {
    // Check Supabase Auth
    console.log('1️⃣ Checking Supabase Auth...');
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = users.users.find(u => u.email === 'timfulker@gmail.com');

    if (authUser) {
      console.log('✅ Found in Supabase Auth:');
      console.log(`   - ID: ${authUser.id}`);
      console.log(`   - Email: ${authUser.email}`);
      console.log(`   - Confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   - Created: ${authUser.created_at}`);
    } else {
      console.log('❌ NOT found in Supabase Auth');
      return;
    }

    console.log('\n2️⃣ Checking main database...');

    // Check main database using Supabase client
    // First, let's see what columns exist
    const { data: dbUsers, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'timfulker@gmail.com');

    if (error) {
      console.log('❌ Database query error:', error.message);
      return;
    }

    if (dbUsers && dbUsers.length > 0) {
      console.log('✅ Found in main database:');
      console.log('   - Full user object:', JSON.stringify(dbUsers[0], null, 2));
      dbUsers.forEach(user => {
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Columns available:`, Object.keys(user));
      });

      const dbUser = dbUsers[0];
      // Check both camelCase and snake_case field names
      const dbSupabaseUid = dbUser.supabaseUid || dbUser.supabase_uid;

      if (dbSupabaseUid === authUser.id) {
        console.log('\n✅ LINKAGE: Supabase UID matches - user is properly linked!');
        console.log(`   Database UID: ${dbSupabaseUid}`);
        console.log(`   Auth UID:     ${authUser.id}`);
      } else if (!dbSupabaseUid) {
        console.log('\n⚠️  LINKAGE: Database user exists but supabaseUid is NULL - needs linking!');
        console.log(`   Should link database user ${dbUser.id} to Supabase user ${authUser.id}`);
      } else {
        console.log('\n❌ LINKAGE: Database user has different Supabase UID!');
        console.log(`   Database: ${dbSupabaseUid}`);
        console.log(`   Auth:     ${authUser.id}`);
      }
    } else {
      console.log('❌ NOT found in main database');
      console.log('\n🚨 ISSUE: User exists in Supabase Auth but not in main database!');
      console.log('   This means the signup process or triggers are not working properly.');
    }

  } catch (error) {
    console.error('❌ Error checking user status:', error.message);
  }
}

checkUserStatus();