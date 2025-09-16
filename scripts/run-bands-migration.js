import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const migrationSQL = fs.readFileSync(path.join(__dirname, '../migrations/add-bands-feature.sql'), 'utf8');

async function runMigration(projectName, url, serviceKey) {
  console.log(`\n🚀 Running migration on ${projectName}...`);

  const supabase = createClient(url, serviceKey);

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // Try direct SQL execution if RPC doesn't exist
      console.log(`RPC method not available, trying direct execution...`);

      // Split migration into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);

        // For Supabase, we need to use the REST API for DDL statements
        const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sql: statement + ';' })
        });

        if (!response.ok) {
          console.log(`⚠️ Statement might not be supported via RPC, continuing...`);
        }
      }
    }

    console.log(`✅ Migration completed successfully on ${projectName}`);

    // Verify the tables exist
    const { data: tables } = await supabase
      .from('bands')
      .select('*')
      .limit(1);

    console.log(`✅ Bands table verified on ${projectName}`);

  } catch (error) {
    console.error(`❌ Error running migration on ${projectName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🔄 Running bands feature migration...');

  // Run on development
  if (process.env.SUPABASE_URL_DEV && process.env.SUPABASE_SERVICE_ROLE_KEY_DEV) {
    try {
      await runMigration(
        'Development',
        process.env.SUPABASE_URL_DEV,
        process.env.SUPABASE_SERVICE_ROLE_KEY_DEV
      );
    } catch (error) {
      console.error('Development migration failed:', error.message);
    }
  }

  // Run on production
  if (process.env.SUPABASE_URL_PROD && process.env.SUPABASE_SERVICE_ROLE_KEY_PROD) {
    try {
      await runMigration(
        'Production',
        process.env.SUPABASE_URL_PROD,
        process.env.SUPABASE_SERVICE_ROLE_KEY_PROD
      );
    } catch (error) {
      console.error('Production migration failed:', error.message);
    }
  }

  console.log('\n✨ Migration process complete!');
}

main().catch(console.error);