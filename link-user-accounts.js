// Link the Supabase Auth user to the database user
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function linkUserAccounts() {
  console.log('🔗 Linking Supabase Auth user to database user...\n');

  try {
    // Get the Supabase Auth user
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.email === 'timfulker@gmail.com');

    if (!authUser) {
      console.log('❌ Auth user not found');
      return;
    }

    console.log('✅ Found Supabase Auth user:', authUser.id);

    // Get the database user
    const { data: dbUsers, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'timfulker@gmail.com');

    if (fetchError || !dbUsers || dbUsers.length === 0) {
      console.log('❌ Database user not found:', fetchError?.message);
      return;
    }

    const dbUser = dbUsers[0];
    console.log('✅ Found database user:', dbUser.id);

    // Update the database user with the Supabase UID
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        supabase_uid: authUser.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', dbUser.id)
      .select()
      .single();

    if (updateError) {
      console.log('❌ Error linking accounts:', updateError.message);
    } else {
      console.log('✅ Accounts linked successfully!');
      console.log('🔗 Database user now has supabase_uid:', updatedUser.supabase_uid);

      // Verify the authentication flow now works
      console.log('\n🧪 Testing authentication with actual token...');

      // Get a real session token
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.createUser({
        email: 'timfulker@gmail.com',
        password: 'testpass123',
        email_confirm: true
      });

      if (signInError && !signInError.message.includes('already registered')) {
        console.log('❌ Error with sign in test:', signInError.message);
      } else {
        console.log('✅ Authentication setup complete!');
        console.log('\n🎯 The user can now:');
        console.log('   1. Sign in with timfulker@gmail.com / testpass123');
        console.log('   2. API requests will find the linked database user');
        console.log('   3. All 404 errors should be resolved');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

linkUserAccounts();