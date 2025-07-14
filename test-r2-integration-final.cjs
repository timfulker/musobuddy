/**
 * Final test of R2 integration with correct credentials and new invoice
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { neon } = require('@neondatabase/serverless');

const client = new S3Client({
  region: 'auto',
  endpoint: 'https://a730a594e40d8b46295554074c8e4413.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '5c81b780406a8bfed414eee3d13bd5f9',
    secretAccessKey: 'b210d2d5db344de07fd936de532ab55280c44fbc64f6298026e2499bafccc13f',
  },
});

async function testR2IntegrationFinal() {
  try {
    console.log('🧪 Final R2 integration test...');
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Get user
    const users = await sql`SELECT * FROM users LIMIT 1`;
    const user = users[0];
    
    // Create a new test invoice for R2 integration
    const testInvoice = {
      userId: user.id,
      invoiceNumber: 'INV-2025-R2-FINAL',
      clientName: 'R2 Final Test Client',
      clientEmail: 'r2final@example.com',
      clientAddress: '789 Final Test Ave, R2 City, R2 4ST',
      performanceFee: '450.00',
      amount: '450.00',
      dueDate: new Date('2025-08-25'),
      status: 'draft'
    };
    
    console.log('📝 Creating new test invoice...');
    const [newInvoice] = await sql`
      INSERT INTO invoices (
        user_id, invoice_number, client_name, client_email, client_address, 
        performance_fee, amount, due_date, status
      ) VALUES (
        ${testInvoice.userId}, ${testInvoice.invoiceNumber}, ${testInvoice.clientName}, 
        ${testInvoice.clientEmail}, ${testInvoice.clientAddress}, ${testInvoice.performanceFee}, 
        ${testInvoice.amount}, ${testInvoice.dueDate}, ${testInvoice.status}
      ) RETURNING *
    `;
    
    console.log('✅ New test invoice created:', newInvoice.invoiceNumber);
    
    // Test R2 upload with PDF-like content
    console.log('\n☁️ Testing R2 upload...');
    const pdfContent = Buffer.from(`
      %PDF-1.4
      Test PDF content for ${newInvoice.invoiceNumber}
      Client: ${testInvoice.clientName}
      Amount: £${testInvoice.performanceFee}
      Generated: ${new Date().toISOString()}
    `);
    
    const key = `users/${user.id}/invoices/${newInvoice.invoiceNumber}-${Date.now()}.pdf`;
    
    const command = new PutObjectCommand({
      Bucket: 'musobuddy-documents',
      Key: key,
      Body: pdfContent,
      ContentType: 'application/pdf',
      ContentDisposition: `attachment; filename="${newInvoice.invoiceNumber}.pdf"`,
    });
    
    const uploadResponse = await client.send(command);
    console.log('✅ PDF uploaded to R2 successfully');
    console.log('ETag:', uploadResponse.ETag);
    
    // Update invoice with cloud storage info
    const publicUrl = `https://musobuddy-documents.a730a594e40d8b46295554074c8e4413.r2.cloudflarestorage.com/${key}`;
    
    await sql`
      UPDATE invoices 
      SET cloud_storage_url = ${publicUrl}, 
          cloud_storage_key = ${key}
      WHERE id = ${newInvoice.id}
    `;
    
    console.log('✅ Invoice updated with cloud storage URLs');
    console.log('🔗 Public URL:', publicUrl);
    console.log('🔑 Storage Key:', key);
    
    // Verify final state
    const [finalInvoice] = await sql`
      SELECT invoice_number, client_name, amount, cloud_storage_url, cloud_storage_key
      FROM invoices 
      WHERE id = ${newInvoice.id}
    `;
    
    console.log('\n🎉 R2 Integration Test Complete!');
    console.log('Invoice:', finalInvoice.invoice_number);
    console.log('Client:', finalInvoice.client_name);
    console.log('Amount:', finalInvoice.amount);
    console.log('Cloud URL:', finalInvoice.cloud_storage_url ? 'Set' : 'Not set');
    console.log('Cloud Key:', finalInvoice.cloud_storage_key ? 'Set' : 'Not set');
    
    console.log('\n📧 Ready for email sending test with R2 integration!');
    
  } catch (error) {
    console.error('❌ R2 integration test failed:', error);
    console.error('Error details:', error.message);
  }
}

testR2IntegrationFinal();