#!/usr/bin/env node
/**
 * One-time migration script to convert old signed AWS URLs to permanent R2 public URLs
 * This fixes the expiring URL issue permanently for all existing invoices and contracts
 */

const { PGClient } = require('./server/core/database');

async function migrateOldUrls() {
  console.log('🔄 Starting one-time URL migration...');
  
  const client = new PGClient();
  
  try {
    // Find all invoices with old signed URLs
    const oldInvoices = await client.query(`
      SELECT id, invoice_number, cloud_storage_url 
      FROM invoices 
      WHERE cloud_storage_url LIKE '%X-Amz-Algorithm%'
    `);
    
    // Find all contracts with old signed URLs  
    const oldContracts = await client.query(`
      SELECT id, contract_number, cloud_storage_url 
      FROM contracts 
      WHERE cloud_storage_url LIKE '%X-Amz-Algorithm%'
    `);
    
    console.log(`📊 Found ${oldInvoices.rows.length} invoices and ${oldContracts.rows.length} contracts with old URLs`);
    
    // Migrate invoices
    for (const invoice of oldInvoices.rows) {
      const newUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/invoices/migrated/${invoice.invoice_number}.pdf`;
      const newKey = `invoices/migrated/${invoice.invoice_number}.pdf`;
      
      await client.query(`
        UPDATE invoices 
        SET cloud_storage_url = $1, cloud_storage_key = $2, updated_at = NOW()
        WHERE id = $3
      `, [newUrl, newKey, invoice.id]);
      
      console.log(`✅ Migrated invoice ${invoice.invoice_number} (ID: ${invoice.id})`);
    }
    
    // Migrate contracts
    for (const contract of oldContracts.rows) {
      const sanitizedNumber = contract.contract_number.replace(/[^a-zA-Z0-9-_]/g, '-');
      const newUrl = `https://pub-446248abf8164fb99bee2fc3dc3c513c.r2.dev/contracts/migrated/${sanitizedNumber}.pdf`;
      const newKey = `contracts/migrated/${sanitizedNumber}.pdf`;
      
      await client.query(`
        UPDATE contracts 
        SET cloud_storage_url = $1, cloud_storage_key = $2, updated_at = NOW()
        WHERE id = $3
      `, [newUrl, newKey, contract.id]);
      
      console.log(`✅ Migrated contract ${contract.contract_number} (ID: ${contract.id})`);
    }
    
    console.log('🎉 Migration completed successfully!');
    console.log('📋 Note: Physical PDFs will be regenerated on first access through the existing fallback system');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  migrateOldUrls();
}

module.exports = { migrateOldUrls };