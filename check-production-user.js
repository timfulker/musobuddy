// Check what exists in production database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Production database
const supabaseProd = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function checkProductionStatus() {
  console.log('🔍 Checking PRODUCTION database status');
  console.log('=' .repeat(50));

  try {
    // 1. Check what tables exist
    const tables = ['users', 'user_settings', 'bookings', 'clients', 'contracts', 'invoices', 'feedback', 'unparseable_messages'];

    console.log('📊 Checking tables:');
    for (const table of tables) {
      try {
        const { count, error } = await supabaseProd
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`  ❌ ${table}: Does not exist`);
        } else {
          console.log(`  ✅ ${table}: Exists (${count || 0} records)`);
        }
      } catch (e) {
        console.log(`  ❌ ${table}: Error checking`);
      }
    }

    console.log('');
    console.log('👤 Checking for timfulkermusic@gmail.com:');

    // 2. Check if user exists
    const { data: user, error: userError } = await supabaseProd
      .from('users')
      .select('*')
      .eq('email', 'timfulkermusic@gmail.com')
      .single();

    if (userError) {
      console.log('  ❌ User not found:', userError.message);
    } else {
      console.log('  ✅ User found:');
      console.log('    - ID:', user.user_id);
      console.log('    - Name:', user.first_name, user.last_name);
      console.log('    - Supabase UID:', user.supabase_uid);
      console.log('    - Firebase UID:', user.firebase_uid);

      // Check user settings
      if (user.user_id) {
        const { data: settings } = await supabaseProd
          .from('user_settings')
          .select('*')
          .eq('user_id', user.user_id)
          .single();

        if (settings) {
          console.log('  ✅ User settings found');
        } else {
          console.log('  ⚠️ User settings not found');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkProductionStatus();