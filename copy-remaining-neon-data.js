// Copy remaining real business data from Neon to Supabase production
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Neon database connection (source)
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_leuHwm5rSOa7@ep-jolly-glitter-ae3liidk.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

// Supabase production connection (destination)
const supabaseProd = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

// Tables that have data and need to be copied
const tablesToCopy = [
  'booking_documents',
  'client_communications',
  'compliance_documents',
  'unparseable_messages',
  'security_monitoring',
  'phone_verifications',
  'beta_invites',
  'beta_invite_codes'
];

async function copyTable(tableName) {
  console.log(`\n📋 Copying ${tableName}...`);

  try {
    // Get data from Neon
    const neonResult = await neonPool.query(`SELECT * FROM ${tableName}`);
    console.log(`📊 Found ${neonResult.rows.length} records in Neon ${tableName}`);

    if (neonResult.rows.length === 0) {
      console.log(`⭕ No data to copy for ${tableName}`);
      return;
    }

    // Insert data into Supabase (batch insert)
    const { data, error } = await supabaseProd
      .from(tableName)
      .insert(neonResult.rows);

    if (error) {
      console.log(`❌ Error inserting ${tableName}:`, error.message);
      console.log(`🔍 Error details:`, error);

      // Try individual inserts to identify problematic records
      console.log(`🔄 Attempting individual inserts...`);
      let successCount = 0;
      let errorCount = 0;

      for (const [index, row] of neonResult.rows.entries()) {
        try {
          const { error: individualError } = await supabaseProd
            .from(tableName)
            .insert([row]);

          if (individualError) {
            console.log(`❌ Row ${index + 1} failed:`, individualError.message);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (individualErr) {
          console.log(`❌ Row ${index + 1} exception:`, individualErr.message);
          errorCount++;
        }
      }

      console.log(`📊 Individual insert results: ${successCount} success, ${errorCount} errors`);

    } else {
      console.log(`✅ Successfully copied ${neonResult.rows.length} records to ${tableName}`);
    }

  } catch (err) {
    console.log(`❌ Exception copying ${tableName}:`, err.message);
  }
}

async function copyAllData() {
  console.log('🚀 COPYING REMAINING BUSINESS DATA FROM NEON TO SUPABASE PRODUCTION');
  console.log('='.repeat(80));

  for (const tableName of tablesToCopy) {
    await copyTable(tableName);
  }

  console.log('\n🎉 Data copy operation completed!');
  await neonPool.end();
}

copyAllData().catch(console.error);