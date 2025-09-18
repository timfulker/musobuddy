// Create user via the signup API endpoint (simulating normal signup process)
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function createUserViaAPI() {
  console.log('👤 Creating user via API signup endpoint...\n');

  try {
    // Get the existing Supabase Auth user
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.email === 'timfulker@gmail.com');

    if (!authUser) {
      console.log('❌ User not found in Supabase Auth');
      return;
    }

    console.log('✅ Found Supabase Auth user:', authUser.id);

    // Create the database user record by calling our API endpoint
    console.log('\n📋 Creating user via signup API endpoint...');

    const response = await fetch('http://localhost:5001/api/auth/supabase-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authUser.access_token || 'dummy-token'}`
      },
      body: JSON.stringify({
        supabaseUid: authUser.id,
        email: authUser.email,
        firstName: 'Tim',
        lastName: 'Fulker'
      })
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('✅ User created via API:', userData);
    } else {
      const errorText = await response.text();
      console.log('❌ API Error:', response.status, errorText);

      // Try direct database insertion with correct column names
      console.log('\n🔄 Trying direct database insertion...');

      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: authUser.email,
          supabase_uid: authUser.id,
          first_name: 'Tim',
          last_name: 'Fulker',
          is_admin: true,
          has_paid: false,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          password_hash: 'supabase_managed'
        })
        .select()
        .single();

      if (error) {
        console.log('❌ Direct insertion error:', error.message);
      } else {
        console.log('✅ User created via direct insertion:', newUser);
      }
    }

    // Test authentication flow
    console.log('\n🧪 Testing authentication flow...');
    const testResponse = await fetch('http://localhost:5001/api/auth/user', {
      headers: {
        'Authorization': `Bearer dummy-token-for-test`
      }
    });

    console.log('🔍 Auth test response:', testResponse.status);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createUserViaAPI();