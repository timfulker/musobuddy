import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Temporary script to create Supabase Auth user for existing database user
const supabaseUrl = process.env.SUPABASE_URL_DEV;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_DEV;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAuthUser() {
  const email = 'timfulkermusic@gmail.com';
  const password = 'TemporaryPassword123!'; // You can change this after creation
  
  try {
    console.log(`🔑 Creating Supabase Auth user for: ${email}`);
    
    // Create the auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true // Skip email verification
    });
    
    if (error) {
      console.error('❌ Failed to create auth user:', error.message);
      return;
    }
    
    console.log('✅ Auth user created successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Temporary password: ${password}`);
    console.log('🔄 You can change the password after logging in');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createAuthUser();