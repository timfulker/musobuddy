// Copy real data from Neon to Supabase production
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Neon database connection
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_leuHwm5rSOa7@ep-jolly-glitter-ae3liidk.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

// Supabase production
const supabaseProd = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function copyTableData(tableName) {
  console.log(`\n📋 Copying ${tableName}...`);

  try {
    // Get data from Neon
    const neonResult = await neonPool.query(`SELECT * FROM ${tableName}`);
    const neonData = neonResult.rows;

    if (neonData.length === 0) {
      console.log(`⚠️ No data in Neon ${tableName}`);
      return { success: true, count: 0 };
    }

    console.log(`📊 Found ${neonData.length} records in Neon ${tableName}`);

    // Clear existing data in Supabase first
    const { error: deleteError } = await supabaseProd
      .from(tableName)
      .delete()
      .neq('id', 0);

    if (deleteError && !deleteError.message.includes('Could not find')) {
      console.log(`⚠️ Could not clear ${tableName}: ${deleteError.message}`);
    }

    // Copy data in batches
    const batchSize = 100;
    let copied = 0;

    for (let i = 0; i < neonData.length; i += batchSize) {
      const batch = neonData.slice(i, i + batchSize);

      const { error: insertError } = await supabaseProd
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.log(`❌ Error inserting to ${tableName}: ${insertError.message}`);
        console.log(`   Sample data: ${JSON.stringify(batch[0]).substring(0, 100)}...`);
        return { success: false, error: insertError.message, copied };
      }

      copied += batch.length;
      console.log(`  ✅ Copied ${copied}/${neonData.length} records`);
    }

    console.log(`🎉 Successfully copied ${copied} records to ${tableName}`);
    return { success: true, count: copied };

  } catch (error) {
    console.log(`❌ Error with ${tableName}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function copyAllData() {
  console.log('🚀 COPYING REAL DATA FROM NEON TO SUPABASE PRODUCTION');
  console.log('='.repeat(70));

  // Tables with real data that need copying
  const tablesWithData = [
    'booking_documents',
    'client_communications',
    'compliance_documents',
    'unparseable_messages',
    'security_monitoring',
    'phone_verifications',
    'beta_invites',
    'beta_invite_codes'
  ];

  const results = {};
  let totalRecords = 0;

  for (const table of tablesWithData) {
    const result = await copyTableData(table);
    results[table] = result;
    if (result.success) {
      totalRecords += result.count || 0;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 DATA COPY SUMMARY:');
  console.log('='.repeat(70));

  for (const [table, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${table}: ${result.count || 0} records`);
    } else {
      console.log(`❌ ${table}: Failed - ${result.error}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(`🎉 Total records copied: ${totalRecords}`);
  console.log('🎯 Real business data now in Supabase production!');
  console.log('='.repeat(70));

  await neonPool.end();
}

// Run the copy
copyAllData().catch(console.error);