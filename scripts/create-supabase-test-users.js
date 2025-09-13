// Create test users in Supabase to match your existing test users
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

const testUsers = [
  {
    email: 'test+admin@example.com',
    password: 'testpass123',
    firstName: 'Test',
    lastName: 'Admin',
    isAdmin: true,
    tier: 'admin'
  },
  {
    email: 'test+user1@example.com',
    password: 'testpass123',
    firstName: 'Test',
    lastName: 'User1',
    isAdmin: false,
    tier: 'free'
  },
  {
    email: 'test+user2@example.com',
    password: 'testpass123',
    firstName: 'Test',
    lastName: 'User2',
    isAdmin: false,
    tier: 'paid'
  },
  {
    email: 'test+demo@example.com',
    password: 'testpass123',
    firstName: 'Demo',
    lastName: 'User',
    isAdmin: false,
    tier: 'free'
  }
];

async function createTestUsers() {
  console.log('🧪 Creating test users in Supabase...');

  for (const userData of testUsers) {
    try {
      console.log(`\n👤 Creating user: ${userData.email}`);

      // Create user with admin API (bypasses email confirmation)
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirm for test users
        user_metadata: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          isAdmin: userData.isAdmin,
          tier: userData.tier,
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`✅ User ${userData.email} already exists`);
        } else {
          console.error(`❌ Error creating ${userData.email}:`, error.message);
        }
      } else {
        console.log(`✅ Created user ${userData.email} with ID: ${data.user.id}`);
      }

    } catch (error) {
      console.error(`❌ Failed to create ${userData.email}:`, error.message);
    }
  }

  console.log('\n🎉 Test user creation complete!');
  console.log('\n📋 You can now test login with any of these credentials:');
  testUsers.forEach(user => {
    console.log(`   📧 ${user.email} / 🔑 ${user.password} (${user.isAdmin ? 'Admin' : user.tier})`);
  });
}

async function testLogin() {
  console.log('\n🧪 Testing login with first user...');

  const testUser = testUsers[0];
  const supabaseClient = createClient(
    process.env.SUPABASE_URL_DEV,
    process.env.SUPABASE_ANON_KEY_DEV
  );

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: testUser.email,
    password: testUser.password,
  });

  if (error) {
    console.error('❌ Login test failed:', error.message);
  } else {
    console.log('✅ Login test successful!');
    console.log(`   📧 Logged in as: ${data.user.email}`);
    console.log(`   🆔 User ID: ${data.user.id}`);
    console.log(`   ✅ Email verified: ${data.user.email_confirmed_at !== null}`);

    // Sign out
    await supabaseClient.auth.signOut();
    console.log('🚪 Signed out successfully');
  }
}

async function main() {
  await createTestUsers();
  await testLogin();
}

main().catch(console.error);