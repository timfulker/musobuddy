// Get the actual schema from development database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function getTableSchema(tableName) {
  try {
    const { data, error } = await supabaseDev
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
      return null;
    }

    if (data && data.length > 0) {
      console.log(`\n📋 ${tableName.toUpperCase()} columns:`);
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const value = data[0][col];
        const type = typeof value;
        console.log(`  - ${col}: ${type} (${value === null ? 'null' : typeof value})`);
      });
      return columns;
    } else {
      console.log(`⚠️ ${tableName}: No data to analyze`);
      return [];
    }
  } catch (error) {
    console.log(`❌ ${tableName}: ${error.message}`);
    return null;
  }
}

async function analyzeSchema() {
  console.log('🔍 Analyzing Development Database Schema');
  console.log('=' .repeat(50));

  const tables = ['clients', 'bookings', 'contracts', 'invoices'];

  for (const table of tables) {
    await getTableSchema(table);
  }
}

analyzeSchema();