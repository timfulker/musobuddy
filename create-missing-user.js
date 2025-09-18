// Create missing user record in main database
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function createMissingUser() {
  console.log('👤 Creating missing user record in main database...\n');

  try {
    // Get the Supabase Auth user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = users.users.find(u => u.email === 'timfulker@gmail.com');

    if (!authUser) {
      console.log('❌ User not found in Supabase Auth');
      return;
    }

    console.log('✅ Found Supabase Auth user:', authUser.id);

    // First, let's check the users table schema by trying to insert a minimal record
    console.log('\n📋 Creating user record in main database...');

    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: authUser.email,
        supabaseUid: authUser.id,
        firstName: authUser.user_metadata?.first_name || 'Tim',
        lastName: authUser.user_metadata?.last_name || 'Fulker',
        isAdmin: true,
        tier: 'admin',
        emailVerified: !!authUser.email_confirmed_at,
        createdAt: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.log('❌ Error creating user record:', error.message);
      console.log('   Error details:', error);

      // Try with different column names
      console.log('\n🔄 Trying with alternative column names...');

      const { data: newUser2, error: error2 } = await supabaseAdmin
        .from('users')
        .insert({
          email: authUser.email,
          supabase_uid: authUser.id, // snake_case
          first_name: 'Tim',
          last_name: 'Fulker',
          is_admin: true,
          tier: 'admin',
          email_verified: !!authUser.email_confirmed_at,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error2) {
        console.log('❌ Error with alternative names:', error2.message);

        // Try minimal insert to see what's required
        console.log('\n🔄 Trying minimal insert...');
        const { data: newUser3, error: error3 } = await supabaseAdmin
          .from('users')
          .insert({
            email: authUser.email
          })
          .select()
          .single();

        if (error3) {
          console.log('❌ Minimal insert failed:', error3.message);
        } else {
          console.log('✅ Minimal user created:', newUser3);
        }
      } else {
        console.log('✅ User created with alternative names:', newUser2);
      }
    } else {
      console.log('✅ User created successfully:', newUser);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createMissingUser();