// Get the exact CREATE TABLE statements from development
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseDev = createClient(
  process.env.SUPABASE_URL_DEV,
  process.env.SUPABASE_SERVICE_KEY_DEV
);

async function getTableStructure() {
  console.log('📋 Getting table structures from development...');

  try {
    // Get table creation SQL from PostgreSQL system tables
    const { data, error } = await supabaseDev
      .rpc('get_table_ddl', {
        table_names: ['bookings', 'clients', 'contracts', 'invoices']
      });

    if (error) {
      console.log('❌ Could not get table structure via RPC');
      console.log('Let me try a different approach...');

      // Alternative: Get column information
      const tables = ['bookings', 'clients', 'contracts', 'invoices'];

      for (const table of tables) {
        console.log(`\n-- ${table.toUpperCase()} table structure`);

        const { data: sample } = await supabaseDev
          .from(table)
          .select('*')
          .limit(1);

        if (sample && sample.length > 0) {
          const columns = Object.keys(sample[0]);
          console.log(`-- Columns: ${columns.join(', ')}`);

          // You'll need to manually recreate these tables in production
          console.log(`-- Run this in PRODUCTION SQL Editor:`);
          console.log(`-- (You'll need to determine the exact column types)`);
        }
      }
    } else {
      console.log('✅ Table structures retrieved');
      console.log(data);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getTableStructure();