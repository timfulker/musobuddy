import { createClient } from '@supabase/supabase-js';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL_DEV
});

// Supabase admin client  
const supabaseUrl = process.env.VITE_SUPABASE_URL_DEV;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_DEV;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createMissingAuth() {
  const email = 'timfulkermusic@gmail.com';
  const newPassword = 'NewPassword123!';
  
  try {
    // Connect to database
    await client.connect();
    console.log('📊 Connected to database');
    
    // Check if user exists in database
    const dbResult = await client.query('SELECT id, email, "supabaseUid" FROM users WHERE email = $1', [email]);
    
    if (dbResult.rows.length === 0) {
      console.log('❌ User not found in database table');
      return;
    }
    
    const dbUser = dbResult.rows[0];
    console.log('✅ Found user in database:', dbUser.id, dbUser.email);
    
    // Check if Supabase Auth record exists
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.email === email);
    
    if (authUser) {
      console.log('✅ Auth record already exists. Resetting password...');
      const { error } = await supabase.auth.admin.updateUserById(authUser.id, { password: newPassword });
      if (error) {
        console.error('❌ Password reset failed:', error.message);
      } else {
        console.log('🔒 Password reset successfully!');
      }
    } else {
      console.log('🔧 Creating missing Supabase Auth record...');
      
      // Create new auth user
      const { data: newAuthUser, error } = await supabase.auth.admin.createUser({
        email: email,
        password: newPassword,
        email_confirm: true // Skip email verification
      });
      
      if (error) {
        console.error('❌ Failed to create auth user:', error.message);
        return;
      }
      
      console.log('✅ Auth record created!');
      
      // Update database with new Supabase UID
      await client.query('UPDATE users SET "supabaseUid" = $1 WHERE email = $2', [newAuthUser.user.id, email]);
      console.log('🔄 Database updated with new Supabase UID');
    }
    
    console.log('\n🚀 SUCCESS!');
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 Password: ${newPassword}`);
    console.log('✅ You can now login!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createMissingAuth();