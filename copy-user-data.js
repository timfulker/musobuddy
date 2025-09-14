// Copy users and user_settings data to production
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Development database
const supabaseDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

// Production database
const supabaseProd = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function copyUserTables() {
  console.log('🚀 COPYING USER DATA TO PRODUCTION');
  console.log('='.repeat(60));

  try {
    // 1. Copy users table
    console.log('\n📋 Copying users table...');

    // Get all users from development
    const { data: devUsers, error: getUsersError } = await supabaseDev
      .from('users')
      .select('*');

    if (getUsersError) {
      console.log('❌ Error fetching users from dev:', getUsersError.message);
      return;
    }

    console.log(`📊 Found ${devUsers.length} users in development`);

    // Get existing user in production (your account)
    const { data: prodUsers, error: getProdUsersError } = await supabaseProd
      .from('users')
      .select('*');

    if (getProdUsersError) {
      console.log('❌ Error fetching users from prod:', getProdUsersError.message);
      return;
    }

    console.log(`📊 Found ${prodUsers.length} users in production`);

    // Find users that don't exist in production
    const existingEmails = prodUsers.map(u => u.email);
    const newUsers = devUsers.filter(u => !existingEmails.includes(u.email));

    console.log(`📈 ${newUsers.length} new users to copy`);

    if (newUsers.length > 0) {
      const { error: insertUsersError } = await supabaseProd
        .from('users')
        .insert(newUsers);

      if (insertUsersError) {
        console.log('❌ Error inserting users:', insertUsersError.message);
        return;
      }

      console.log(`✅ Successfully copied ${newUsers.length} users`);
    } else {
      console.log('ℹ️ No new users to copy');
    }

    // 2. Copy user_settings table
    console.log('\n📋 Copying user_settings table...');

    // Get all user_settings from development
    const { data: devSettings, error: getSettingsError } = await supabaseDev
      .from('user_settings')
      .select('*');

    if (getSettingsError) {
      console.log('❌ Error fetching user_settings from dev:', getSettingsError.message);
      return;
    }

    console.log(`📊 Found ${devSettings.length} user_settings in development`);

    // Get existing settings in production
    const { data: prodSettings, error: getProdSettingsError } = await supabaseProd
      .from('user_settings')
      .select('*');

    if (getProdSettingsError) {
      console.log('❌ Error fetching user_settings from prod:', getProdSettingsError.message);
      return;
    }

    console.log(`📊 Found ${prodSettings.length} user_settings in production`);

    // Find settings that don't exist in production (by user_id)
    const existingUserIds = prodSettings.map(s => s.user_id);
    const newSettings = devSettings.filter(s => !existingUserIds.includes(s.user_id));

    console.log(`📈 ${newSettings.length} new user_settings to copy`);

    if (newSettings.length > 0) {
      const { error: insertSettingsError } = await supabaseProd
        .from('user_settings')
        .insert(newSettings);

      if (insertSettingsError) {
        console.log('❌ Error inserting user_settings:', insertSettingsError.message);
        return;
      }

      console.log(`✅ Successfully copied ${newSettings.length} user_settings`);
    } else {
      console.log('ℹ️ No new user_settings to copy');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 USER DATA COPY COMPLETE!');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

// Run the copy
copyUserTables().catch(console.error);