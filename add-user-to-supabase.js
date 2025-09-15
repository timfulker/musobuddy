// Add your user to Supabase production users table
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseProd = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function addUser() {
  console.log('🚀 ADDING USER TO SUPABASE PRODUCTION');

  // Your user data (from the working Neon database)
  const userData = {
    user_id: 1754488522516,
    email: 'timfulkermusic@gmail.com',
    first_name: 'Tim',
    last_name: 'Fulker',
    is_admin: true,
    is_active: true,
    is_lifetime: false,
    has_paid: true,
    email_verified: true,
    supabase_uid: 'def19542-0bdc-44e6-88d0-0e101ac1368a',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabaseProd
      .from('users')
      .insert([userData]);

    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ User added successfully!');
      console.log('🎉 You should now be able to log in');
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

addUser().catch(console.error);