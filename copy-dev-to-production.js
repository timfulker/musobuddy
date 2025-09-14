// Copy all data from development to production database
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

async function copyTable(tableName, batchSize = 100) {
  console.log(`\n📋 Copying ${tableName}...`);

  try {
    // First, clear existing data in production (except users table)
    if (tableName !== 'users') {
      const { error: deleteError } = await supabaseProd
        .from(tableName)
        .delete()
        .neq('id', 0); // Delete all records

      if (deleteError && deleteError.code !== 'PGRST116') {
        console.log(`  ⚠️ Could not clear ${tableName}:`, deleteError.message);
      }
    }

    // Get all data from development
    let allData = [];
    let rangeStart = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error, count } = await supabaseDev
        .from(tableName)
        .select('*', { count: 'exact' })
        .range(rangeStart, rangeStart + batchSize - 1);

      if (error) {
        console.log(`  ❌ Error reading ${tableName}:`, error.message);
        return { success: false, error: error.message };
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        rangeStart += batchSize;
        hasMore = data.length === batchSize;
      } else {
        hasMore = false;
      }
    }

    if (allData.length === 0) {
      console.log(`  ⚠️ No data to copy in ${tableName}`);
      return { success: true, count: 0 };
    }

    // Insert data in batches to production
    let inserted = 0;
    for (let i = 0; i < allData.length; i += batchSize) {
      const batch = allData.slice(i, Math.min(i + batchSize, allData.length));

      const { error: insertError } = await supabaseProd
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });

      if (insertError) {
        console.log(`  ❌ Error inserting into ${tableName}:`, insertError.message);
        console.log(`     Failed at batch starting at index ${i}`);
        return { success: false, error: insertError.message, inserted };
      }

      inserted += batch.length;
      process.stdout.write(`  ✅ Copied ${inserted}/${allData.length} records\r`);
    }

    console.log(`  ✅ Successfully copied ${inserted} records to ${tableName}`);
    return { success: true, count: inserted };

  } catch (error) {
    console.log(`  ❌ Unexpected error with ${tableName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function copyAllData() {
  console.log('🚀 Starting full database copy from DEVELOPMENT to PRODUCTION');
  console.log('=' .repeat(60));

  // Order matters due to foreign key constraints
  const tables = [
    'clients',          // Independent table
    'bookings',         // Depends on clients
    'contracts',        // Depends on bookings
    'invoices',         // Depends on bookings
    'unparseable_messages',  // Independent
    'feedback',         // Independent
    'email_templates',  // Independent
    'sms_verifications', // Independent
    'booking_conflicts', // Depends on bookings
    'conflict_resolutions' // Depends on conflicts
  ];

  const results = {};
  let totalRecords = 0;

  for (const table of tables) {
    const result = await copyTable(table);
    results[table] = result;
    if (result.success) {
      totalRecords += result.count || 0;
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 COPY SUMMARY:');
  console.log('=' .repeat(60));

  for (const [table, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${table}: ${result.count || 0} records`);
    } else {
      console.log(`❌ ${table}: Failed - ${result.error}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log(`🎉 Total records copied: ${totalRecords}`);
  console.log('=' .repeat(60));

  // Special note about users
  console.log('\n📝 NOTE: Users table was NOT copied to preserve production auth.');
  console.log('You can manually manage users through Supabase dashboard.');
}

// Run the copy
copyAllData().catch(console.error);