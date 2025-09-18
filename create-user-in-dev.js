// Create timfulkermusic@gmail.com in DEV database to match backend
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const supabaseAdminDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

const supabaseAdminProd = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function createUserInDev() {
  console.log('🔄 Creating timfulkermusic@gmail.com in DEV database...\n');

  try {
    const email = 'timfulkermusic@gmail.com';
    const password = 'musicpass123';

    // Get the prod auth user details
    console.log('🔍 Getting PROD auth user details...');
    const { data: prodAuthUsers } = await supabaseAdminProd.auth.admin.listUsers();
    const prodAuthUser = prodAuthUsers.users.find(u => u.email === email);

    if (prodAuthUser) {
      console.log('✅ Found PROD auth user:', prodAuthUser.id);
    }

    // Create auth user in DEV
    console.log('\n📧 Creating DEV auth user...');
    const { data: devAuthUser, error: authError } = await supabaseAdminDev.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError && !authError.message.includes('already been registered')) {
      console.log('❌ DEV Auth creation error:', authError.message);
      return;
    }

    let devUserId;
    if (authError?.message.includes('already been registered')) {
      console.log('✅ DEV auth user already exists, finding...');
      const { data: existingDevUsers } = await supabaseAdminDev.auth.admin.listUsers();
      const existingDevUser = existingDevUsers.users.find(u => u.email === email);
      devUserId = existingDevUser?.id;
    } else {
      devUserId = devAuthUser.user.id;
    }

    console.log('✅ DEV Auth user ID:', devUserId);

    // Create database user in DEV
    console.log('\n💾 Creating DEV database user...');
    const { data: devDbUser, error: devDbError } = await supabaseAdminDev
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
        onboarding_completed: true
      }, {
        onConflict: 'email',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (devDbError) {
      console.log('❌ DEV Database error:', devDbError.message);
    } else {
      console.log('✅ DEV Database user created:', devDbUser);
    }

    // Test backend API connection
    console.log('\n🧪 Testing backend API connection...');
    try {
      const response = await fetch('http://localhost:5001/api/auth/user', {
        headers: {
          'Authorization': `Bearer dummy-test-token`,
          'Content-Type': 'application/json'
        }
      });
      console.log('🔍 Backend API response:', response.status, response.statusText);
    } catch (fetchError) {
      console.log('⚠️ Backend API test failed:', fetchError.message);
    }

    console.log('\n🎉 DEV ENVIRONMENT SETUP COMPLETE!');
    console.log('📧 Email: timfulkermusic@gmail.com');
    console.log('🔑 Password: musicpass123');
    console.log('🌍 Environment: DEV (matches backend)');
    console.log('🚀 Backend: http://localhost:5001');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createUserInDev();