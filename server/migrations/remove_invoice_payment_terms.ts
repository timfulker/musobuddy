import { db } from '../core/database';
import { sql } from 'drizzle-orm';

async function removeInvoicePaymentTermsColumn() {
  try {
    console.log('🔧 Removing invoice_payment_terms column from users table...');
    
    // Remove the invoice_payment_terms column
    await db.execute(sql`
      ALTER TABLE users 
      DROP COLUMN IF EXISTS invoice_payment_terms
    `);
    
    console.log('✅ invoice_payment_terms column removed successfully');
  } catch (error) {
    console.error('❌ Error removing invoice_payment_terms column:', error);
    throw error;
  }
}

// Run the migration
removeInvoicePaymentTermsColumn()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });