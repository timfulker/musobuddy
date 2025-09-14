// Check which tables have data in development vs production
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

// All tables found earlier
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

async function getTableCount(client, tableName, dbName) {
  try {
    const { count, error } = await client
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${dbName} - ${tableName}: ${error.message}`);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.log(`❌ ${dbName} - ${tableName}: ${error.message}`);
    return 0;
  }
}

async function compareTableData() {
  console.log('🔍 CHECKING TABLE DATA COUNTS');
  console.log('='.repeat(80));

  const results = [];
  let devTablesWithData = 0;
  let prodTablesWithData = 0;
  let tablesNeedingData = [];

  console.log('\n📊 TABLE DATA COMPARISON:');
  console.log('='.repeat(80));
  console.log('Table Name'.padEnd(25) + 'Dev Count'.padEnd(15) + 'Prod Count'.padEnd(15) + 'Status');
  console.log('-'.repeat(80));

  for (const table of allTables) {
    const devCount = await getTableCount(supabaseDev, table, 'DEV');
    const prodCount = await getTableCount(supabaseProd, table, 'PROD');

    if (devCount > 0) devTablesWithData++;
    if (prodCount > 0) prodTablesWithData++;

    let status = '✅ Synced';
    if (devCount > 0 && prodCount === 0) {
      status = '❌ Missing Data';
      tablesNeedingData.push({ table, devCount, prodCount });
    } else if (devCount !== prodCount) {
      status = '⚠️ Different Count';
      tablesNeedingData.push({ table, devCount, prodCount });
    } else if (devCount === 0 && prodCount === 0) {
      status = '⭕ Empty';
    }

    console.log(
      table.padEnd(25) +
      devCount.toString().padEnd(15) +
      prodCount.toString().padEnd(15) +
      status
    );

    results.push({ table, devCount, prodCount, status });
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(80));

  console.log(`📈 Dev tables with data: ${devTablesWithData}/${allTables.length}`);
  console.log(`📉 Prod tables with data: ${prodTablesWithData}/${allTables.length}`);
  console.log(`❌ Tables needing data: ${tablesNeedingData.length}`);

  if (tablesNeedingData.length > 0) {
    console.log('\n🚨 TABLES NEEDING DATA COPY:');
    tablesNeedingData.forEach(({ table, devCount, prodCount }) => {
      console.log(`  ❌ ${table}: DEV=${devCount}, PROD=${prodCount}`);
    });
  }

  return { results, tablesNeedingData, devTablesWithData, prodTablesWithData };
}

// Run the comparison
compareTableData().catch(console.error);