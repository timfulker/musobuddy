import { db } from '../core/database';

/**
 * Migration: Add custom_invoice_terms column to user_settings table
 * Date: 2025-01-09
 * Purpose: Add configurable custom invoice terms
 */

export async function addCustomInvoiceTermsMigration() {
  console.log('🔄 Starting migration: Add custom_invoice_terms column...');
  
  try {
    // Add custom_invoice_terms column with default empty array
    await db.execute(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS custom_invoice_terms JSONB DEFAULT '[]'
    `);
    
    console.log('✅ Migration completed: Added custom_invoice_terms column');
    
    // Verify the column exists
    const result = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND column_name = 'custom_invoice_terms'
    `);
    
    console.log('📋 Result:', result);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  addCustomInvoiceTermsMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}