// Check schema differences between dev and prod
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

async function checkTableSchema(client, tableName, dbName) {
  try {
    // Get one record to see the structure
    const { data, error } = await client
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${dbName} - ${tableName}: ${error.message}`);
      return null;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️ ${dbName} - ${tableName}: No data to examine schema`);
      return {};
    }

    const columns = Object.keys(data[0]);
    console.log(`✅ ${dbName} - ${tableName}: ${columns.length} columns`);
    return columns;
  } catch (error) {
    console.log(`❌ ${dbName} - ${tableName}: ${error.message}`);
    return null;
  }
}

async function compareSchemas() {
  console.log('🔍 CHECKING SCHEMA DIFFERENCES');
  console.log('='.repeat(80));

  const tablesToCheck = ['users', 'user_settings'];

  for (const table of tablesToCheck) {
    console.log(`\n📋 Checking ${table} table schema...`);

    const devSchema = await checkTableSchema(supabaseDev, table, 'DEV');
    const prodSchema = await checkTableSchema(supabaseProd, table, 'PROD');

    if (devSchema && prodSchema) {
      const devCols = devSchema.sort();
      const prodCols = prodSchema.sort();

      console.log(`\n${table.toUpperCase()} SCHEMA COMPARISON:`);
      console.log('-'.repeat(60));

      // Find differences
      const missingInProd = devCols.filter(col => !prodCols.includes(col));
      const extraInProd = prodCols.filter(col => !devCols.includes(col));

      console.log(`DEV columns (${devCols.length}):`, devCols.join(', '));
      console.log(`PROD columns (${prodCols.length}):`, prodCols.join(', '));

      if (missingInProd.length > 0) {
        console.log(`❌ Missing in PROD: ${missingInProd.join(', ')}`);
      }

      if (extraInProd.length > 0) {
        console.log(`➕ Extra in PROD: ${extraInProd.join(', ')}`);
      }

      if (missingInProd.length === 0 && extraInProd.length === 0) {
        console.log(`✅ Schemas match perfectly!`);
      }
    }
  }
}

// Run the comparison
compareSchemas().catch(console.error);