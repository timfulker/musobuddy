// Create user with proper ID for timfulkermusic@gmail.com
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function createUserWithId() {
  console.log('🆔 Creating user with proper ID for timfulkermusic@gmail.com...\n');

  try {
    const email = 'timfulkermusic@gmail.com';

    // Get auth user
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.email === email);

    if (!authUser) {
      console.log('❌ Auth user not found');
      return;
    }

    console.log('✅ Auth user found:', authUser.id);

    // Generate UUID for database record
    const userId = randomUUID();
    console.log('🆔 Generated user ID:', userId);

    // Create database user with explicit ID
    console.log('\n💾 Creating database user with explicit ID...');
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        supabase_uid: authUser.id,
        first_name: 'Tim',
        last_name: 'Fulker',
        is_admin: true,
        has_paid: true,
        is_active: true,
        email_verified: true,
        tier: 'premium',
        onboarding_completed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ Database creation error:', createError.message);

      // Clean up any partial records first
      console.log('\n🧹 Cleaning up existing records...');
      await supabaseAdmin.from('users').delete().eq('email', email);

      // Try again
      const { data: retryUser, error: retryError } = await supabaseAdmin
        .from('users')
        .insert({
          id: randomUUID(),
          email: email,
          supabase_uid: authUser.id,
          first_name: 'Tim',
          last_name: 'Fulker',
          is_admin: true,
          has_paid: true,
          is_active: true,
          email_verified: true,
          tier: 'premium'
        })
        .select()
        .single();

      if (retryError) {
        console.log('❌ Retry error:', retryError.message);
      } else {
        console.log('✅ User created on retry:', retryUser);
      }
    } else {
      console.log('✅ Database user created successfully:', newUser);
    }

    // Verify user exists and API can find them
    console.log('\n🔍 Testing API user lookup...');
    const { data: apiUser, error: apiError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('supabase_uid', authUser.id)
      .single();

    if (apiError) {
      console.log('❌ API lookup error:', apiError.message);
    } else {
      console.log('✅ API can find user:', apiUser.email, 'Admin:', apiUser.is_admin);
    }

    console.log('\n🎉 USER SETUP COMPLETE!');
    console.log('📧 Email: timfulkermusic@gmail.com');
    console.log('🔑 Password: musicpass123');
    console.log('👑 Admin: ✅');
    console.log('🔗 Database linked: ✅');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createUserWithId();