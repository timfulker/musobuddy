import { db } from '../core/database';

/**
 * Migration: Add invoice_payment_terms column to user_settings table
 * Date: 2025-01-09
 * Purpose: Fix missing invoice payment terms field in database schema
 */

export async function addInvoicePaymentTermsMigration() {
  console.log('🔄 Starting migration: Add invoice_payment_terms column...');
  
  try {
    // Add invoice_payment_terms column with default value
    await db.execute(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS invoice_payment_terms VARCHAR DEFAULT '7_days'
    `);
    
    console.log('✅ Migration completed: Added invoice_payment_terms column');
    
    // Verify the column exists
    const result = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND column_name = 'invoice_payment_terms'
    `);
    
    if (result.length > 0) {
      console.log('✅ Verification successful: invoice_payment_terms column exists');
    } else {
      console.error('❌ Verification failed: invoice_payment_terms column not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  addInvoicePaymentTermsMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}