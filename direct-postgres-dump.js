// Direct PostgreSQL dump from development to production
// This bypasses Supabase backup system and uses raw PostgreSQL

import { execSync } from 'child_process';
import fs from 'fs';

// Connection strings (you'll need to get these from Supabase)
const devConnection = "postgresql://postgres.[DEV_PROJECT_ID]:[DEV_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres";
const prodConnection = "postgresql://postgres.[PROD_PROJECT_ID]:[PROD_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres";

console.log('🚀 Starting direct PostgreSQL migration...');

try {
  // Step 1: Dump development database
  console.log('📤 Exporting development database...');
  execSync(`pg_dump "${devConnection}" --schema=public --data-only --inserts > dev_data.sql`, { stdio: 'inherit' });

  // Step 2: Dump schema separately
  console.log('📋 Exporting schema...');
  execSync(`pg_dump "${devConnection}" --schema=public --schema-only > dev_schema.sql`, { stdio: 'inherit' });

  // Step 3: Import to production
  console.log('📥 Importing to production...');
  execSync(`psql "${prodConnection}" < dev_schema.sql`, { stdio: 'inherit' });
  execSync(`psql "${prodConnection}" < dev_data.sql`, { stdio: 'inherit' });

  console.log('✅ Migration completed successfully!');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
}