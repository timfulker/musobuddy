import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Import missing data via Supabase API
async function importMissingData() {
  console.log('🔄 Importing Missing Data via Supabase API\n');
  console.log('=========================================\n');

  // Create Supabase client with service role key
  const supabase = createClient(
    process.env.SUPABASE_URL_DEV,
    process.env.SUPABASE_SERVICE_KEY_DEV,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // Read CSV files that were already exported
    const tables = [
      { name: 'contracts', file: 'contracts.csv' }  // Only import contracts since others are done
    ];

    for (const table of tables) {
      console.log(`📥 Importing ${table.name}...`);

      // Check if CSV file exists
      const csvPath = `./${table.file}`;
      if (!fs.existsSync(csvPath)) {
        console.log(`   ⚠️  CSV file not found: ${csvPath}`);
        continue;
      }

      // Read and parse CSV
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
      });

      if (records.length === 0) {
        console.log(`   ℹ️  No records to import`);
        continue;
      }

      // Clean up the data - convert empty strings to null
      const cleanedRecords = records.map(record => {
        const cleaned = {};
        for (const [key, value] of Object.entries(record)) {
          cleaned[key] = value === '' ? null : value;
        }
        return cleaned;
      });

      // Insert data via Supabase API
      const { data, error } = await supabase
        .from(table.name)
        .insert(cleanedRecords);

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Imported ${records.length} records`);
      }
    }

    // Verify final counts
    console.log('\n📊 Verifying final data counts:\n');

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ${table.name}: ❌ Error - ${error.message}`);
      } else {
        console.log(`   ${table.name}: ${count || 0} records`);
      }
    }

    console.log('\n✅ Import complete!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Load environment variables and run
import dotenv from 'dotenv';
dotenv.config();

importMissingData().catch(console.error);