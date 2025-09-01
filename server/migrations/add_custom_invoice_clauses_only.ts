import { db } from '../core/database';

(async () => {
  try {
    console.log('🔄 Adding custom_invoice_clauses field only...');
    
    console.log('➕ Adding custom_invoice_clauses column...');
    await db.execute(`
      ALTER TABLE user_settings 
      ADD COLUMN custom_invoice_clauses JSONB DEFAULT '[]';
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added: custom_invoice_clauses (JSONB, default: [])');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
})();