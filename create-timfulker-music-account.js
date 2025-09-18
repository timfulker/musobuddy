// Create timfulkermusic@gmail.com account in MusoBuddy
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function createTimFulkerMusicAccount() {
  console.log('🎵 Creating timfulkermusic@gmail.com account in MusoBuddy...\n');

  try {
    const email = 'timfulkermusic@gmail.com';
    const password = 'musicpass123';

    // Step 1: Create Supabase Auth user
    console.log('📧 Creating Supabase Auth user...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.log('❌ Auth creation error:', authError.message);
      return;
    }

    console.log('✅ Supabase Auth user created:', authUser.user.id);

    // Step 2: Create database user record
    console.log('\n💾 Creating database user record...');
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
        password_hash: 'supabase_managed'
      })
      .select()
      .single();

    if (dbError) {
      console.log('❌ Database user creation error:', dbError.message);
    } else {
      console.log('✅ Database user created:', dbUser);
    }

    console.log('\n🎉 Account created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🆔 Supabase UID:', authUser.user.id);

  } catch (error) {
    console.error('❌ Error creating account:', error.message);
  }
}

createTimFulkerMusicAccount();