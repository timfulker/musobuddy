// Check timfulkermusic@gmail.com account in PRODUCTION
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function checkTimFulkerMusicProd() {
  console.log('🔍 Checking timfulkermusic@gmail.com in PRODUCTION...\n');

  try {
    const email = 'timfulkermusic@gmail.com';

    // Check if user exists in Supabase Auth
    console.log('📧 Checking Supabase Auth users...');
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.email === email);

    if (authUser) {
      console.log('✅ Found in Supabase Auth:', authUser.id);
      console.log('📅 Created:', authUser.created_at);
      console.log('📧 Email confirmed:', authUser.email_confirmed_at ? 'Yes' : 'No');
    } else {
      console.log('❌ Not found in Supabase Auth');
    }

    // Check if user exists in database
    console.log('\n💾 Checking database users table...');
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (dbError) {
      console.log('❌ Database query error:', dbError.message);
    } else if (dbUser) {
      console.log('✅ Found in database:', dbUser);
    } else {
      console.log('❌ Not found in database');
    }

    // If auth user exists but no db user, create db user
    if (authUser && dbError?.code === 'PGRST116') {
      console.log('\n🔧 Creating missing database user...');
      const { data: newDbUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          email: email,
          supabase_uid: authUser.id,
          first_name: 'Tim',
          last_name: 'Fulker',
          is_admin: true,
          has_paid: false,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Error creating db user:', createError.message);
      } else {
        console.log('✅ Database user created:', newDbUser);
      }
    }

    // Update password to ensure it's correct
    if (authUser) {
      console.log('\n🔑 Updating password...');
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: 'musicpass123' }
      );

      if (passwordError) {
        console.log('❌ Password update error:', passwordError.message);
      } else {
        console.log('✅ Password updated successfully');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTimFulkerMusicProd();