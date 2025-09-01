import { db } from '../core/database';

(async () => {
  try {
    console.log('🔄 Reverting invoice clauses changes...');
    
    // Remove the invoice_clauses and custom_invoice_clauses columns we added
    console.log('🗑️ Removing invoice_clauses column...');
    await db.execute(`
      ALTER TABLE user_settings 
      DROP COLUMN IF EXISTS invoice_clauses;
    `);
    
    console.log('🗑️ Removing custom_invoice_clauses column...');
    await db.execute(`
      ALTER TABLE user_settings 
      DROP COLUMN IF EXISTS custom_invoice_clauses;
    `);
    
    console.log('✅ Revert completed successfully!');
    console.log('📋 Back to working contract clauses only');
    
  } catch (error) {
    console.error('❌ Revert failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
})();