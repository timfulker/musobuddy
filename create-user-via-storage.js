// Create user via the storage system
import { createClient } from '@supabase/supabase-js';
import { storage } from './server/core/storage.js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function createUserViaStorage() {
  console.log('👤 Creating user via storage system...\n');

  try {
    // Get the Supabase Auth user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = users.users.find(u => u.email === 'timfulker@gmail.com');

    if (!authUser) {
      console.log('❌ User not found in Supabase Auth');
      return;
    }

    console.log('✅ Found Supabase Auth user:', authUser.id);

    // Create user using storage system
    console.log('\n📋 Creating user via storage system...');

    const userData = {
      id: crypto.randomUUID(), // Generate a new UUID for the database
      email: authUser.email,
      firstName: 'Tim',
      lastName: 'Fulker',
      supabaseUid: authUser.id,
      isAdmin: true,
      tier: 'admin',
      phoneVerified: false,
      isBetaTester: true
    };

    console.log('👤 Creating user with data:', userData);

    const newUser = await storage.createUser(userData);

    if (newUser) {
      console.log('✅ User created successfully via storage system!');
      console.log('📊 User details:', {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        supabaseUid: newUser.supabaseUid
      });

      // Verify the user can be found
      console.log('\n🔍 Verifying user can be found...');
      const foundUser = await storage.getUserBySupabaseUid(authUser.id);
      if (foundUser) {
        console.log('✅ User found by Supabase UID!');
      } else {
        console.log('❌ User NOT found by Supabase UID');
      }

      const foundUserByEmail = await storage.getUserByEmail(authUser.email);
      if (foundUserByEmail) {
        console.log('✅ User found by email!');
      } else {
        console.log('❌ User NOT found by email');
      }

    } else {
      console.log('❌ Failed to create user');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

createUserViaStorage();