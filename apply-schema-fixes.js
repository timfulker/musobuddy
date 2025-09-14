// Apply schema fixes to production database
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// Production database
const supabaseProd = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
);

async function applySchemaFixes() {
  console.log('🔧 APPLYING SCHEMA FIXES TO PRODUCTION');
  console.log('='.repeat(60));

  try {
    // Read the SQL file
    const sqlContent = readFileSync('./fix-production-schemas.sql', 'utf8');

    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔧 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   ${statement.substring(0, 60)}...`);

      try {
        const { data, error } = await supabaseProd.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          console.log(`❌ Error: ${error.message}`);
        } else {
          console.log(`✅ Success`);
        }
      } catch (err) {
        console.log(`❌ Exception: ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SCHEMA FIXES COMPLETE!');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('❌ Error reading SQL file:', error.message);
  }
}

// Run the schema fixes
applySchemaFixes().catch(console.error);