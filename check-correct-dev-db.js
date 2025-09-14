// Check the correct Musobuddy_Dev Supabase database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 CHECKING SUPABASE DEVELOPMENT DATABASE CREDENTIALS');
console.log('='.repeat(60));

console.log('Development URL:', process.env.SUPABASE_URL_DEV);
console.log('Development Project ID:', process.env.SUPABASE_URL_DEV?.split('//')[1]?.split('.')[0]);

// Development database
const supabaseDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

// Test connection and try to list all tables systematically
async function findAllTables() {
  console.log('\n🔍 SYSTEMATIC TABLE DISCOVERY');
  console.log('='.repeat(60));

  // Try common table discovery methods
  try {
    // Method 1: Try to get a list via information_schema (if accessible)
    console.log('\n📋 Method 1: Trying to access schema information...');

    const { data: schemaData, error: schemaError } = await supabaseDev
      .from('information_schema.tables')
      .select('table_name');

    if (schemaData) {
      console.log(`✅ Found ${schemaData.length} tables via schema query`);
      schemaData.forEach(row => console.log(`   📋 ${row.table_name}`));
    } else {
      console.log('❌ Schema query failed:', schemaError?.message);
    }
  } catch (err) {
    console.log('❌ Schema access not available');
  }

  // Method 2: Try accessing known table names and see what works
  console.log('\n📋 Method 2: Testing known table names...');

  const knownTables = [
    'users', 'user_settings', 'bookings', 'clients', 'contracts', 'invoices',
    'notifications', 'settings', 'email_logs', 'sms_logs', 'admin_logs',
    'verification_codes', 'password_resets', 'file_uploads', 'sessions',
    'booking_feedback', 'client_feedback', 'templates', 'sms_templates',
    'email_templates', 'venues', 'packages', 'pricing', 'availability',
    'calendar_events', 'forms', 'documents', 'messages', 'conversations',
    'webhooks', 'integrations', 'audit_logs', 'payment_logs',
    'subscription_plans', 'payments', 'refunds', 'discounts', 'coupons',
    'reports', 'analytics', 'metrics', 'backups', 'migrations',
    'compliance_data'
  ];

  const existingTables = [];

  for (const table of knownTables) {
    try {
      const { data, error } = await supabaseDev
        .from(table)
        .select('*')
        .limit(1);

      if (!error) {
        const count = await supabaseDev
          .from(table)
          .select('*', { count: 'exact', head: true });

        existingTables.push({
          name: table,
          hasData: data && data.length > 0,
          totalRecords: count.count || 0
        });

        console.log(`✅ ${table}: ${count.count || 0} records`);
      }
    } catch (err) {
      // Table doesn't exist, skip
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`🎯 FOUND ${existingTables.length} TABLES IN DEVELOPMENT`);
  console.log('='.repeat(60));

  existingTables.forEach(table => {
    console.log(`📋 ${table.name}: ${table.totalRecords} records`);
  });

  return existingTables;
}

// Run the discovery
findAllTables().catch(console.error);