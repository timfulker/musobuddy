import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL_DEV;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_DEV;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  const email = 'timfulkermusic@gmail.com';
  const newPassword = 'NewPassword123!';
  
  try {
    console.log(`🔑 Resetting password for: ${email}`);
    
    // First, get all users to find the ID
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ List users error:', listError.message);
      return;
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ User not found:', email);
      return;
    }
    
    console.log(`🔍 Found user ID: ${user.id}`);
    
    // Update the user's password directly (admin bypass)
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log('✅ Password reset successfully!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 New password: ${newPassword}`);
    console.log('🚀 You can now login with this password');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetPassword();