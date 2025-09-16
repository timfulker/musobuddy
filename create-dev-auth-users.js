#!/usr/bin/env node

// Script to create Supabase Auth records in DEVELOPMENT environment
import { createClient } from '@supabase/supabase-js';

// Development Supabase credentials  
const supabaseUrl = process.env.SUPABASE_URL_DEV;
const serviceKey = process.env.SUPABASE_SERVICE_KEY_DEV;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL_DEV or SUPABASE_SERVICE_KEY_DEV');
  process.exit(1);
}

// Create admin client for development
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Users to create (matching database records)
const usersToCreate = [
  {
    email: 'info@groovemeister.co.uk',
    firstName: 'Tim',
    lastName: 'Fulker', 
    originalNeonId: '8FEV4ncSe5od5MaRYk66l',
    password: 'TempPass123!'
  },
  {
    email: 'timfulker@gmail.com', 
    firstName: 'Tim',
    lastName: 'Fulker',
    originalNeonId: '43963086',
    password: 'TempPass123!'
  }
];

async function createDevAuthUsers() {
  console.log('🚀 Creating Supabase Auth records in DEVELOPMENT...');
  console.log(`📡 Using Supabase URL: ${supabaseUrl}`);
  
  for (const user of usersToCreate) {
    console.log(`\n👤 Creating dev auth record for: ${user.email}`);
    
    try {
      // Create the auth user in development
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,  // Auto-confirm email
        user_metadata: {
          firstName: user.firstName,
          lastName: user.lastName,
          email_verified: true,
          migration_date: new Date().toISOString(),
          original_neon_id: user.originalNeonId,
          migrated_from_neon: true
        }
      });
      
      if (error) {
        console.error(`❌ Failed to create ${user.email}:`, error.message);
        continue;
      }
      
      console.log(`✅ Created DEV auth record for ${user.email}`);
      console.log(`   - Supabase UID: ${data.user.id}`);
      console.log(`   - Original Neon ID: ${user.originalNeonId}`);
      console.log(`   - Email confirmed: ${data.user.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Update database to match the new UID
      console.log(`🔄 Need to update database supabase_uid to: ${data.user.id}`);
      
    } catch (createError) {
      console.error(`❌ Exception creating ${user.email}:`, createError.message);
    }
  }
  
  console.log('\n🎯 Development auth records created!');
  console.log('📝 Next: Update database UIDs to match development Supabase UIDs');
}

// Run the script
createDevAuthUsers().catch(console.error);