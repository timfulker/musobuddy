// Get ALL tables from Supabase development database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Development database (Supabase)
const supabaseDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

// Try to access every possible table name that might exist
const possibleTables = [
  // Core tables we know exist
  'users', 'user_settings', 'bookings', 'clients', 'contracts', 'invoices',
  'sessions', 'email_templates',

  // Tables we created
  'notifications', 'settings', 'email_logs', 'sms_logs', 'admin_logs',
  'verification_codes', 'password_resets', 'file_uploads', 'booking_feedback',
  'client_feedback', 'templates', 'sms_templates',

  // Additional possible tables
  'venues', 'packages', 'pricing', 'availability', 'calendar_events',
  'forms', 'documents', 'messages', 'conversations', 'webhooks',
  'integrations', 'audit_logs', 'payment_logs', 'subscription_plans',
  'payments', 'refunds', 'discounts', 'coupons', 'reports', 'analytics',
  'metrics', 'backups', 'migrations', 'compliance_data',

  // Common business tables
  'equipment', 'staff', 'roles', 'permissions', 'invoices_items',
  'contract_templates', 'email_campaigns', 'sms_campaigns',
  'payment_methods', 'tax_rates', 'currencies', 'countries',
  'time_zones', 'languages', 'themes', 'widgets',

  // Possible API/system tables
  'api_keys', 'oauth_tokens', 'refresh_tokens', 'login_attempts',
  'activity_logs', 'error_logs', 'feature_flags', 'experiments',
  'subscriptions', 'billing_history', 'usage_stats', 'quotas'
];

async function checkAllTables() {
  console.log('🔍 CHECKING ALL POSSIBLE TABLES IN SUPABASE DEVELOPMENT');
  console.log('='.repeat(70));

  const existingTables = [];
  const nonExistentTables = [];

  for (const table of possibleTables) {
    try {
      const { data, error } = await supabaseDev
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
          nonExistentTables.push(table);
        } else {
          // Table exists but has other issues
          console.log(`⚠️ ${table}: ${error.message}`);
          existingTables.push({ table, hasData: false, error: error.message });
        }
      } else {
        // Table exists and is accessible
        const hasData = data && data.length > 0;
        console.log(`✅ ${table}: ${hasData ? 'HAS DATA' : 'EMPTY'}`);
        existingTables.push({ table, hasData, dataCount: data?.length || 0 });
      }
    } catch (err) {
      nonExistentTables.push(table);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUPABASE DEVELOPMENT DATABASE ANALYSIS:');
  console.log('='.repeat(70));

  console.log(`\n✅ EXISTING TABLES (${existingTables.length}):`);
  existingTables.forEach(({ table, hasData, dataCount, error }) => {
    if (error) {
      console.log(`   📋 ${table} - ERROR: ${error}`);
    } else {
      console.log(`   📋 ${table} - ${hasData ? `${dataCount} records` : 'EMPTY'}`);
    }
  });

  console.log(`\n❌ NON-EXISTENT TABLES (${nonExistentTables.length}):`);
  nonExistentTables.slice(0, 20).forEach(table => {
    console.log(`   🚫 ${table}`);
  });
  if (nonExistentTables.length > 20) {
    console.log(`   ... and ${nonExistentTables.length - 20} more`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`🎯 TOTAL TABLES IN SUPABASE DEV: ${existingTables.length}`);
  console.log('='.repeat(70));

  return existingTables;
}

// Run the analysis
checkAllTables().catch(console.error);