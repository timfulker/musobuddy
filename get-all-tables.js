// Get complete list of all tables from development database
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

async function getAllTables(client, dbName) {
  console.log(`\n📋 Getting all tables from ${dbName}...`);

  try {
    // Query information_schema to get all user tables
    const { data, error } = await client.rpc('sql', {
      query: `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });

    if (error) {
      console.log(`❌ Error getting tables from ${dbName}:`, error.message);
      return [];
    }

    const tables = data.map(row => row.table_name);
    console.log(`✅ Found ${tables.length} tables in ${dbName}:`);
    tables.forEach(table => console.log(`  - ${table}`));

    return tables;
  } catch (error) {
    console.log(`❌ Unexpected error getting tables from ${dbName}:`, error.message);
    return [];
  }
}

async function compareTableLists() {
  console.log('🔍 COMPARING DATABASE TABLES');
  console.log('='.repeat(60));

  const devTables = await getAllTables(supabaseDev, 'DEVELOPMENT');
  const prodTables = await getAllTables(supabaseProd, 'PRODUCTION');

  // Find missing tables
  const missingTables = devTables.filter(table => !prodTables.includes(table));
  const extraTables = prodTables.filter(table => !devTables.includes(table));

  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPARISON RESULTS:');
  console.log('='.repeat(60));

  console.log(`\n📈 Development tables: ${devTables.length}`);
  console.log(`📉 Production tables: ${prodTables.length}`);
  console.log(`❌ Missing in production: ${missingTables.length}`);
  console.log(`➕ Extra in production: ${extraTables.length}`);

  if (missingTables.length > 0) {
    console.log('\n🚨 MISSING TABLES IN PRODUCTION:');
    missingTables.forEach(table => console.log(`  ❌ ${table}`));
  }

  if (extraTables.length > 0) {
    console.log('\n⚠️ EXTRA TABLES IN PRODUCTION:');
    extraTables.forEach(table => console.log(`  ➕ ${table}`));
  }

  return { devTables, prodTables, missingTables, extraTables };
}

// Run the comparison
compareTableLists().catch(console.error);