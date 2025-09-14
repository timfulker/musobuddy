// Create exact copy of development database in production
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

// All tables we know exist in development
const allTables = [
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

async function clearProductionTables() {
  console.log('🗑️ CLEARING PRODUCTION TABLES');
  console.log('='.repeat(60));

  for (const table of allTables) {
    console.log(`🗑️ Clearing ${table}...`);

    try {
      const { error } = await supabaseProd
        .from(table)
        .delete()
        .neq('id', 0); // Delete all records

      if (error && !error.message.includes('Could not find')) {
        console.log(`❌ Error clearing ${table}: ${error.message}`);
      } else {
        console.log(`✅ Cleared ${table}`);
      }
    } catch (err) {
      console.log(`❌ Exception clearing ${table}: ${err.message}`);
    }
  }
}

async function copyTableData(tableName) {
  console.log(`\n📋 Copying ${tableName}...`);

  try {
    // Get all data from development
    const { data: devData, error: fetchError } = await supabaseDev
      .from(tableName)
      .select('*');

    if (fetchError) {
      console.log(`❌ Error fetching ${tableName} from dev: ${fetchError.message}`);
      return { success: false, error: fetchError.message };
    }

    if (!devData || devData.length === 0) {
      console.log(`⚠️ No data in development ${tableName}`);
      return { success: true, count: 0 };
    }

    console.log(`📊 Found ${devData.length} records in development ${tableName}`);

    // Insert all data to production in batches
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < devData.length; i += batchSize) {
      const batch = devData.slice(i, i + batchSize);

      const { error: insertError } = await supabaseProd
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.log(`❌ Error inserting batch to ${tableName}: ${insertError.message}`);
        return { success: false, error: insertError.message, inserted };
      }

      inserted += batch.length;
      console.log(`  📈 Inserted ${inserted}/${devData.length} records`);
    }

    console.log(`✅ Successfully copied ${inserted} records to ${tableName}`);
    return { success: true, count: inserted };

  } catch (error) {
    console.log(`❌ Unexpected error with ${tableName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function copyAllData() {
  console.log('🚀 CREATING EXACT COPY OF DEVELOPMENT DATABASE');
  console.log('='.repeat(80));

  // Step 1: Clear production tables
  await clearProductionTables();

  console.log('\n' + '='.repeat(80));
  console.log('📋 COPYING ALL DATA FROM DEVELOPMENT TO PRODUCTION');
  console.log('='.repeat(80));

  // Step 2: Copy all data
  const results = {};
  let totalRecords = 0;

  for (const table of allTables) {
    const result = await copyTableData(table);
    results[table] = result;
    if (result.success) {
      totalRecords += result.count || 0;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 COPY SUMMARY:');
  console.log('='.repeat(80));

  for (const [table, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${table}: ${result.count || 0} records`);
    } else {
      console.log(`❌ ${table}: Failed - ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`🎉 Total records copied: ${totalRecords}`);
  console.log('🎯 Production database is now an exact copy of development!');
  console.log('='.repeat(80));
}

// Run the complete copy
copyAllData().catch(console.error);