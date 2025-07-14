/**
 * Test R2 integration with invoice creation
 */

import { neon } from '@neondatabase/serverless';
import { uploadInvoiceToCloud } from './server/cloud-storage.js';

async function testR2Invoice() {
  try {
    console.log('🧪 Testing R2 integration with invoice creation...');
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Get authenticated user
    const users = await sql`SELECT * FROM users LIMIT 1`;
    if (!users.length) {
      console.error('❌ No users found');
      return;
    }
    
    const user = users[0];
    console.log('👤 Using user:', user.email);
    
    // Get user settings
    const settings = await sql`SELECT * FROM user_settings WHERE user_id = ${user.id}`;
    const userSettings = settings[0] || null;
    
    // Create test invoice
    const testInvoice = {
      userId: user.id,
      invoiceNumber: 'INV-TEST-R2-001',
      clientName: 'Test Client for R2',
      clientEmail: 'test@example.com',
      clientAddress: '123 Test Street, Test City, TC1 2ST',
      performanceFee: '250.00',
      dueDate: new Date('2025-08-15'),
      description: 'Test invoice for R2 storage integration',
      status: 'draft'
    };
    
    const [newInvoice] = await sql`
      INSERT INTO invoices (
        user_id, invoice_number, client_name, client_email, client_address, 
        performance_fee, due_date, description, status
      ) VALUES (
        ${testInvoice.userId}, ${testInvoice.invoiceNumber}, ${testInvoice.clientName}, 
        ${testInvoice.clientEmail}, ${testInvoice.clientAddress}, ${testInvoice.performanceFee}, 
        ${testInvoice.dueDate}, ${testInvoice.description}, ${testInvoice.status}
      ) RETURNING *
    `;
    
    console.log('✅ Test invoice created:', newInvoice.invoiceNumber);
    
    console.log('☁️ Testing cloud storage upload...');
    const uploadResult = await uploadInvoiceToCloud(newInvoice, null, userSettings);
    
    if (uploadResult.success) {
      console.log('✅ R2 upload successful!');
      console.log('🔗 Cloud URL:', uploadResult.url);
      console.log('🔑 Storage key:', uploadResult.key);
      
      // Update invoice with cloud storage info
      await sql`
        UPDATE invoices 
        SET cloud_storage_url = ${uploadResult.url}, cloud_storage_key = ${uploadResult.key}
        WHERE id = ${newInvoice.id}
      `;
      
      console.log('✅ Invoice updated with cloud storage info');
    } else {
      console.error('❌ R2 upload failed:', uploadResult.error);
    }
    
    // Clean up test invoice
    await sql`DELETE FROM invoices WHERE id = ${newInvoice.id}`;
    console.log('🧹 Test invoice cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testR2Invoice();