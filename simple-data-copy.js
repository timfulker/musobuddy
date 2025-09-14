// Simple data copy using Supabase JavaScript API
// This uses the credentials we already have in .env
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

async function copyTableData(tableName, batchSize = 1000) {
  console.log(`\n📋 Copying ${tableName}...`);

  try {
    // Get total count first
    const { count: totalCount, error: countError } = await supabaseDev
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log(`❌ Error counting ${tableName}:`, countError.message);
      return { success: false, error: countError.message };
    }

    console.log(`📊 Total records in ${tableName}: ${totalCount}`);

    if (totalCount === 0) {
      console.log(`⚠️ No data to copy in ${tableName}`);
      return { success: true, count: 0 };
    }

    // Clear existing data in production first
    const { error: deleteError } = await supabaseProd
      .from(tableName)
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError && !deleteError.message.includes('Could not find')) {
      console.log(`⚠️ Could not clear ${tableName}:`, deleteError.message);
    }

    // Copy data in batches
    let copied = 0;
    let offset = 0;

    while (offset < totalCount) {
      // Fetch batch from development
      const { data, error: fetchError } = await supabaseDev
        .from(tableName)
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (fetchError) {
        console.log(`❌ Error fetching ${tableName}:`, fetchError.message);
        return { success: false, error: fetchError.message };
      }

      if (!data || data.length === 0) {
        break;
      }

      // Insert batch to production
      const { error: insertError } = await supabaseProd
        .from(tableName)
        .insert(data);

      if (insertError) {
        console.log(`❌ Error inserting ${tableName}:`, insertError.message);
        return { success: false, error: insertError.message, copied };
      }

      copied += data.length;
      offset += batchSize;

      // Progress indicator
      const progress = Math.round((copied / totalCount) * 100);
      process.stdout.write(`  📈 Progress: ${copied}/${totalCount} (${progress}%)\r`);
    }

    console.log(`\n✅ Successfully copied ${copied} records to ${tableName}`);
    return { success: true, count: copied };

  } catch (error) {
    console.log(`❌ Unexpected error with ${tableName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function createTablesInProduction() {
  console.log('🏗️ Creating tables in production...');

  // First check if tables exist
  const checkBookings = await supabaseProd.from('bookings').select('id').limit(1);

  if (checkBookings.error && checkBookings.error.message.includes('does not exist')) {
    console.log('❌ Tables do not exist in production!');
    console.log('You need to create the table structure first.');
    console.log('Go to Production Dashboard → SQL Editor and run the schema from development.');
    return false;
  }

  console.log('✅ Tables exist in production');
  return true;
}

async function copyAllData() {
  console.log('🚀 Starting data copy from DEVELOPMENT to PRODUCTION');
  console.log('=' .repeat(60));

  // Check if tables exist
  const tablesExist = await createTablesInProduction();
  if (!tablesExist) {
    return;
  }

  // Copy data in dependency order
  const tables = [
    'clients',
    'bookings',
    'contracts',
    'invoices'
  ];

  const results = {};
  let totalRecords = 0;

  for (const table of tables) {
    const result = await copyTableData(table);
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
}

// Run the copy
copyAllData().catch(console.error);