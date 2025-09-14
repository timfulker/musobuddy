// List tables by trying to access them
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

// Common table names to check
const commonTables = [
  'users', 'user_settings', 'bookings', 'clients', 'contracts', 'invoices',
  'booking_feedback', 'client_feedback', 'compliance_data', 'notifications',
  'settings', 'admin_logs', 'email_logs', 'sms_logs', 'payment_logs',
  'calendar_events', 'availability', 'venues', 'packages', 'pricing',
  'templates', 'forms', 'documents', 'messages', 'conversations',
  'file_uploads', 'webhooks', 'integrations', 'audit_logs', 'sessions',
  'verification_codes', 'password_resets', 'email_templates', 'sms_templates',
  'subscription_plans', 'payments', 'refunds', 'discounts', 'coupons',
  'reports', 'analytics', 'metrics', 'backups', 'migrations'
];

async function checkTableExists(client, tableName, dbName) {
  try {
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation') && error.message.includes('does not exist')) {
        return false;
      }
      // Other errors might still mean the table exists but has issues
      console.log(`⚠️ ${dbName} - ${tableName}: ${error.message}`);
      return true;
    }

    return true;
  } catch (error) {
    return false;
  }
}

async function listExistingTables() {
  console.log('🔍 CHECKING TABLE EXISTENCE');
  console.log('='.repeat(60));

  const devTables = [];
  const prodTables = [];

  console.log('\n📋 Checking development database...');
  for (const table of commonTables) {
    const exists = await checkTableExists(supabaseDev, table, 'DEV');
    if (exists) {
      devTables.push(table);
      console.log(`✅ DEV: ${table}`);
    }
  }

  console.log('\n📋 Checking production database...');
  for (const table of commonTables) {
    const exists = await checkTableExists(supabaseProd, table, 'PROD');
    if (exists) {
      prodTables.push(table);
      console.log(`✅ PROD: ${table}`);
    }
  }

  // Find missing tables
  const missingTables = devTables.filter(table => !prodTables.includes(table));

  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTS:');
  console.log('='.repeat(60));

  console.log(`\n📈 Development tables found: ${devTables.length}`);
  console.log(`📉 Production tables found: ${prodTables.length}`);
  console.log(`❌ Missing in production: ${missingTables.length}`);

  if (missingTables.length > 0) {
    console.log('\n🚨 MISSING TABLES IN PRODUCTION:');
    missingTables.forEach(table => console.log(`  ❌ ${table}`));
  }

  console.log('\n📋 DEV TABLES:');
  devTables.forEach(table => console.log(`  ✅ ${table}`));

  console.log('\n📋 PROD TABLES:');
  prodTables.forEach(table => console.log(`  ✅ ${table}`));

  return { devTables, prodTables, missingTables };
}

// Run the check
listExistingTables().catch(console.error);