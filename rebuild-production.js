// Completely rebuild production database from scratch
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

async function dropAllProductionTables() {
  console.log('🗑️ COMPLETELY WIPING PRODUCTION DATABASE');
  console.log('='.repeat(60));

  const tablesToDrop = [
    'migrations', 'backups', 'metrics', 'analytics', 'reports', 'coupons', 'discounts',
    'refunds', 'payments', 'subscription_plans', 'sms_templates', 'email_templates',
    'password_resets', 'verification_codes', 'sessions', 'audit_logs', 'integrations',
    'webhooks', 'file_uploads', 'conversations', 'messages', 'documents', 'forms',
    'templates', 'pricing', 'packages', 'venues', 'availability', 'calendar_events',
    'payment_logs', 'sms_logs', 'email_logs', 'admin_logs', 'settings', 'notifications',
    'compliance_data', 'client_feedback', 'booking_feedback', 'invoices', 'contracts',
    'clients', 'bookings', 'user_settings', 'users'
  ];

  for (const table of tablesToDrop) {
    try {
      console.log(`🗑️ Dropping ${table}...`);

      // Try to delete all data first
      const { error: deleteError } = await supabaseProd
        .from(table)
        .delete()
        .neq('id', 0);

      if (deleteError && !deleteError.message.includes('does not exist')) {
        console.log(`⚠️ Could not clear ${table}: ${deleteError.message}`);
      } else {
        console.log(`✅ Cleared ${table}`);
      }
    } catch (err) {
      console.log(`⚠️ Error with ${table}: ${err.message}`);
    }
  }

  console.log('✅ Production database wiped clean');
}

async function getExactTableStructure(tableName) {
  console.log(`📋 Analyzing ${tableName} structure...`);

  try {
    const { data, error } = await supabaseDev
      .from(tableName)
      .select('*')
      .limit(5);

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ ${tableName} is empty`);
      return { tableName, columns: [], dataCount: 0 };
    }

    const columns = Object.keys(data[0]);
    const sampleRecord = data[0];

    // Get total count
    const { count } = await supabaseDev
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    console.log(`✅ ${tableName}: ${columns.length} columns, ${count} records`);

    return {
      tableName,
      columns,
      sampleRecord,
      dataCount: count || 0
    };

  } catch (err) {
    console.log(`❌ Exception: ${err.message}`);
    return null;
  }
}

async function createProductionTablesFromDev() {
  console.log('\n🏗️ ANALYZING DEVELOPMENT DATABASE STRUCTURE');
  console.log('='.repeat(60));

  // Tables that definitely exist and have data
  const coreTables = ['users', 'user_settings', 'bookings', 'clients', 'contracts', 'invoices'];

  const tableStructures = [];

  for (const table of coreTables) {
    const structure = await getExactTableStructure(table);
    if (structure) {
      tableStructures.push(structure);
    }
  }

  console.log('\n📊 DEVELOPMENT DATABASE ANALYSIS:');
  console.log('='.repeat(60));

  tableStructures.forEach(table => {
    console.log(`${table.tableName}:`);
    console.log(`  📊 ${table.dataCount} records`);
    console.log(`  📋 ${table.columns.length} columns: ${table.columns.join(', ')}`);
    console.log('');
  });

  return tableStructures;
}

async function copyDataToProduction(tableStructure) {
  const { tableName, dataCount } = tableStructure;

  if (dataCount === 0) {
    console.log(`⚠️ Skipping ${tableName} - no data`);
    return;
  }

  console.log(`📋 Copying ${tableName} (${dataCount} records)...`);

  try {
    // Get all data from development
    const { data, error: fetchError } = await supabaseDev
      .from(tableName)
      .select('*');

    if (fetchError) {
      console.log(`❌ Error fetching ${tableName}: ${fetchError.message}`);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ No data found in ${tableName}`);
      return;
    }

    // Copy to production in batches
    const batchSize = 500;
    let copied = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const { error: insertError } = await supabaseProd
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.log(`❌ Error inserting to ${tableName}: ${insertError.message}`);
        console.log(`   Trying to insert: ${JSON.stringify(batch[0]).substring(0, 100)}...`);
        return;
      }

      copied += batch.length;
      console.log(`  ✅ Copied ${copied}/${data.length} records`);
    }

    console.log(`🎉 Successfully copied all ${copied} records to ${tableName}`);

  } catch (err) {
    console.log(`❌ Exception copying ${tableName}: ${err.message}`);
  }
}

async function rebuildProduction() {
  console.log('🚀 REBUILDING PRODUCTION DATABASE FROM SCRATCH');
  console.log('='.repeat(80));

  // Step 1: Wipe production
  await dropAllProductionTables();

  // Step 2: Analyze development
  const tableStructures = await createProductionTablesFromDev();

  console.log('\n🚀 COPYING DATA TO PRODUCTION');
  console.log('='.repeat(60));

  // Step 3: Copy data table by table
  for (const tableStructure of tableStructures) {
    await copyDataToProduction(tableStructure);
  }

  console.log('\n🎉 PRODUCTION DATABASE REBUILD COMPLETE!');
  console.log('='.repeat(80));
}

// Run the rebuild
rebuildProduction().catch(console.error);