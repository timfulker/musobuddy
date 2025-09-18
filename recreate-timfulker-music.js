// Recreate timfulkermusic@gmail.com account completely
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function recreateTimFulkerMusicAccount() {
  console.log('🔄 Recreating timfulkermusic@gmail.com account from scratch...\n');

  try {
    const email = 'timfulkermusic@gmail.com';
    const password = 'musicpass123';

    // First, try to delete any existing account
    console.log('🗑️ Checking for existing account...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      console.log('🗑️ Deleting existing auth user...');
      await supabaseAdmin.auth.admin.deleteUser(existingUser.id);
    }

    // Delete from database if exists
    console.log('🗑️ Cleaning database...');
    await supabaseAdmin.from('users').delete().eq('email', email);

    console.log('✅ Cleanup complete\n');

    // Create fresh account
    console.log('📧 Creating NEW Supabase Auth user...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.log('❌ Auth creation error:', authError.message);
      return;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Create database user
    console.log('\n💾 Creating database user...');
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        email: email,
        supabase_uid: authUser.user.id,
        first_name: 'Tim',
        last_name: 'Fulker',
        is_admin: true,
        has_paid: false,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        email_verified: true,
        tier: 'premium'
      })
      .select()
      .single();

    if (dbError) {
      console.log('❌ Database error:', dbError.message);
    } else {
      console.log('✅ Database user created:', dbUser);
    }

    console.log('\n🎉 FRESH ACCOUNT CREATED!');
    console.log('📧 Email: timfulkermusic@gmail.com');
    console.log('🔑 Password: musicpass123');
    console.log('🆔 Supabase UID:', authUser.user.id);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

recreateTimFulkerMusicAccount();