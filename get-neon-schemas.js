// Get exact schemas from Neon database
import pg from 'pg';
const { Pool } = pg;

// Neon database connection
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_leuHwm5rSOa7@ep-jolly-glitter-ae3liidk.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function getTableSchema(tableName) {
  try {
    const result = await neonPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1 AND table_schema = 'public'
      ORDER BY ordinal_position
    `, [tableName]);

    return result.rows;
  } catch (error) {
    console.log(`❌ Error getting schema for ${tableName}: ${error.message}`);
    return [];
  }
}

async function generateMissingColumns() {
  console.log('🔍 GETTING NEON SCHEMAS FOR FAILED TABLES');
  console.log('='.repeat(60));

  const failedTables = [
    'client_communications',
    'compliance_documents',
    'unparseable_messages',
    'security_monitoring',
    'phone_verifications'
  ];

  let alterStatements = [];

  for (const table of failedTables) {
    console.log(`\n📋 Getting schema for ${table}...`);

    const columns = await getTableSchema(table);

    if (columns.length > 0) {
      console.log(`✅ Found ${columns.length} columns`);

      alterStatements.push(`-- Add missing columns for ${table}`);

      columns.forEach(col => {
        let dataType = col.data_type;

        // Map PostgreSQL types to Supabase-friendly types
        if (dataType === 'character varying') dataType = 'VARCHAR';
        if (dataType === 'timestamp without time zone') dataType = 'TIMESTAMP';
        if (dataType === 'timestamp with time zone') dataType = 'TIMESTAMPTZ';
        if (dataType === 'bigint') dataType = 'BIGINT';
        if (dataType === 'integer') dataType = 'INTEGER';
        if (dataType === 'boolean') dataType = 'BOOLEAN';
        if (dataType === 'text') dataType = 'TEXT';
        if (dataType === 'jsonb') dataType = 'JSONB';
        if (dataType === 'numeric') dataType = 'DECIMAL';

        let defaultClause = '';
        if (col.column_default) {
          if (col.column_default.includes('now()') || col.column_default.includes('CURRENT_TIMESTAMP')) {
            defaultClause = ' DEFAULT NOW()';
          } else if (col.column_default !== 'NULL') {
            defaultClause = ` DEFAULT ${col.column_default}`;
          }
        }

        const nullable = col.is_nullable === 'YES' ? '' : ' NOT NULL';

        alterStatements.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col.column_name} ${dataType}${defaultClause}${nullable};`);
      });

      alterStatements.push(''); // Empty line between tables
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📄 SQL TO ADD MISSING COLUMNS:');
  console.log('='.repeat(60));

  alterStatements.forEach(stmt => console.log(stmt));

  await neonPool.end();
}

generateMissingColumns().catch(console.error);