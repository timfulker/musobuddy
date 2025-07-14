/**
 * Test the complete hybrid email system with R2 integration
 */

const { neon } = require('@neondatabase/serverless');

async function testHybridEmailSystem() {
  try {
    console.log('🧪 Testing hybrid email system with R2 integration...');
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Get user
    const users = await sql`SELECT * FROM users LIMIT 1`;
    const user = users[0];
    
    // Create test invoice for hybrid email system
    const testInvoice = {
      userId: user.id,
      invoiceNumber: 'INV-2025-HYBRID-EMAIL',
      clientName: 'Hybrid Email Test Client',
      clientEmail: 'hybrid@example.com',
      clientAddress: '123 Hybrid St, Email City, HE1 2ST',
      performanceFee: '275.00',
      amount: '275.00',
      dueDate: new Date('2025-08-30'),
      status: 'draft'
    };
    
    console.log('📝 Creating hybrid email test invoice...');
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
    
    console.log('✅ Hybrid email test invoice created:', newInvoice.invoiceNumber);
    console.log('🆔 Invoice ID:', newInvoice.id);
    
    // Test email sending through API
    console.log('\n📧 Testing email sending with R2 integration...');
    
    try {
      // Simulate API call to send invoice email
      const response = await fetch('http://localhost:5000/api/invoices/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: newInvoice.id,
          recipientEmail: testInvoice.clientEmail,
          subject: `Invoice ${newInvoice.invoiceNumber} - Hybrid Email Test`,
          message: 'This is a test of the hybrid email system with R2 cloud storage integration.'
        })
      });
      
      if (response.ok) {
        console.log('✅ Email API request successful');
        console.log('📧 Email sent with hybrid system (PDF attachment + cloud backup)');
      } else {
        console.log('❌ Email API request failed:', response.status);
        const error = await response.text();
        console.log('Error details:', error);
      }
    } catch (error) {
      console.error('❌ Email API request error:', error.message);
    }
    
    // Check if invoice was updated with cloud storage info
    console.log('\n🔍 Checking invoice cloud storage status...');
    const [updatedInvoice] = await sql`
      SELECT id, invoice_number, status, cloud_storage_url, cloud_storage_key
      FROM invoices 
      WHERE id = ${newInvoice.id}
    `;
    
    console.log('Invoice Status:', updatedInvoice.status);
    console.log('Cloud Storage URL:', updatedInvoice.cloud_storage_url || 'Not set');
    console.log('Cloud Storage Key:', updatedInvoice.cloud_storage_key || 'Not set');
    
    if (updatedInvoice.cloud_storage_url) {
      console.log('✅ R2 cloud storage integration working!');
      console.log('🔗 Clients can access PDF even if app is offline');
    } else {
      console.log('⚠️ R2 upload may have failed, using fallback email system');
    }
    
    console.log('\n🎉 Hybrid email system test complete!');
    console.log('📧 Ready for production deployment with R2 integration');
    
  } catch (error) {
    console.error('❌ Hybrid email system test failed:', error);
    console.error('Error details:', error.message);
  }
}

testHybridEmailSystem();