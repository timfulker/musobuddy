// Create timfulkermusic@gmail.com account in PRODUCTION MusoBuddy
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function createTimFulkerMusicProdAccount() {
  console.log('🎵 Creating timfulkermusic@gmail.com account in PRODUCTION MusoBuddy...\n');

  try {
    const email = 'timfulkermusic@gmail.com';
    const password = 'musicpass123';

    // Step 1: Create Supabase Auth user in PRODUCTION
    console.log('📧 Creating Supabase Auth user in PRODUCTION...');
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      console.log('❌ Auth creation error:', authError.message);
      return;
    }

    console.log('✅ Production Supabase Auth user created:', authUser.user.id);

    // Step 2: Create database user record in PRODUCTION
    console.log('\n💾 Creating database user record in PRODUCTION...');
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .insert({
        email: email,
        supabase_uid: authUser.user.id,
        first_name: 'Tim',
        last_name: 'Fulker',
        is_admin: true,
        has_paid: false,
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (dbError) {
      console.log('❌ Database user creation error:', dbError.message);
    } else {
      console.log('✅ Production database user created:', dbUser);
    }

    console.log('\n🎉 PRODUCTION Account created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('🆔 Production Supabase UID:', authUser.user.id);
    console.log('🌐 Environment: PRODUCTION (dknmckqaraedpimxdsqq)');

  } catch (error) {
    console.error('❌ Error creating production account:', error.message);
  }
}

createTimFulkerMusicProdAccount();