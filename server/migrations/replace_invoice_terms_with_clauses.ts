import { db } from '../core/database';

(async () => {
  try {
    console.log('🔄 Starting migration: Replace invoice_terms with invoice_clauses...');
    
    // Step 1: Add new invoice_clauses and custom_invoice_clauses columns
    console.log('➕ Adding new invoice_clauses column...');
    await db.execute(`
      ALTER TABLE user_settings 
      ADD COLUMN invoice_clauses JSONB DEFAULT '{}';
    `);
    
    console.log('➕ Adding new custom_invoice_clauses column...');
    await db.execute(`
      ALTER TABLE user_settings 
      ADD COLUMN custom_invoice_clauses JSONB DEFAULT '[]';
    `);
    
    // Step 2: Remove old invoice_terms and custom_invoice_terms columns
    console.log('🗑️ Removing old invoice_terms column...');
    await db.execute(`
      ALTER TABLE user_settings 
      DROP COLUMN IF EXISTS invoice_terms;
    `);
    
    console.log('🗑️ Removing old custom_invoice_terms column...');
    await db.execute(`
      ALTER TABLE user_settings 
      DROP COLUMN IF EXISTS custom_invoice_terms;
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 New fields created:');
    console.log('  - invoice_clauses (JSONB, default: {})');
    console.log('  - custom_invoice_clauses (JSONB, default: [])');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
})();