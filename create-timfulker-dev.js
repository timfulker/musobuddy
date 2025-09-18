// Create timfulker@gmail.com in DEV environment with admin privileges
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const supabaseAdminDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function createTimFulkerDev() {
  console.log('🔧 Creating timfulker@gmail.com in DEV environment...\n');

  try {
    const email = 'timfulker@gmail.com';
    const password = 'devpass123';

    // Create auth user in DEV
    console.log('📧 Creating DEV auth user...');
    const { data: authUser, error: authError } = await supabaseAdminDev.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError && !authError.message.includes('already been registered')) {
      console.log('❌ Auth creation error:', authError.message);
      return;
    }

    let devUserId;
    if (authError?.message.includes('already been registered')) {
      console.log('✅ Auth user already exists, finding...');
      const { data: existingUsers } = await supabaseAdminDev.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === email);
      devUserId = existingUser?.id;
      console.log('✅ Found existing auth user:', devUserId);
    } else {
      devUserId = authUser.user.id;
      console.log('✅ Created new auth user:', devUserId);
    }

    // Create database user in DEV
    console.log('\n💾 Creating DEV database user...');
    const { data: dbUser, error: dbError } = await supabaseAdminDev
      .from('users')
      .upsert({
        id: randomUUID(),
        email: email,
        supabase_uid: devUserId,
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
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (dbError) {
      console.log('❌ Database error:', dbError.message);

      // Try simpler approach
      console.log('\n🔄 Trying simple database insertion...');
      const { data: simpleUser, error: simpleError } = await supabaseAdminDev
        .from('users')
        .insert({
          id: randomUUID(),
          email: email,
          supabase_uid: devUserId,
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

      if (simpleError) {
        console.log('❌ Simple insertion error:', simpleError.message);
      } else {
        console.log('✅ Database user created (simple):', simpleUser);
      }
    } else {
      console.log('✅ Database user created:', dbUser);
    }

    // Verify final state
    console.log('\n🔍 Verifying user creation...');
    const { data: finalUser } = await supabaseAdminDev
      .from('users')
      .select('id, email, supabase_uid, is_admin, first_name, last_name, tier')
      .eq('email', email)
      .single();

    if (finalUser) {
      console.log('✅ VERIFICATION SUCCESSFUL:');
      console.log('📧 Email:', finalUser.email);
      console.log('🆔 Database ID:', finalUser.id);
      console.log('🔗 Supabase UID:', finalUser.supabase_uid);
      console.log('👑 Admin:', finalUser.is_admin);
      console.log('💎 Tier:', finalUser.tier);
      console.log('👤 Name:', finalUser.first_name, finalUser.last_name);
    }

    console.log('\n🎉 DEV ADMIN ACCOUNT READY!');
    console.log('📧 Email: timfulker@gmail.com');
    console.log('🔑 Password: devpass123');
    console.log('🌍 Environment: DEVELOPMENT');
    console.log('👑 Admin: ✅');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTimFulkerDev();