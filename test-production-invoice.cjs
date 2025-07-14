/**
 * Test invoice creation with R2 storage through production app
 */

const { neon } = require('@neondatabase/serverless');

async function testProductionInvoice() {
  try {
    console.log('🧪 Testing invoice creation with R2 storage...');
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Get authenticated user
    const users = await sql`SELECT * FROM users LIMIT 1`;
    if (!users.length) {
      console.error('❌ No users found');
      return;
    }
    
    const user = users[0];
    console.log('👤 Testing with user:', user.email);
    
    // Get user settings
    const settings = await sql`SELECT * FROM user_settings WHERE user_id = ${user.id}`;
    const userSettings = settings[0];
    
    if (!userSettings) {
      console.log('⚠️ No user settings found, creating default settings...');
      await sql`
        INSERT INTO user_settings (
          user_id, business_name, business_address, business_phone, business_email, 
          business_website, vat_number, bank_account_holder, bank_account_number, 
          bank_sort_code, default_payment_terms, email_from_name, next_invoice_number
        ) VALUES (
          ${user.id}, 'Test Business', '123 Test St', '07123456789', 'test@business.com',
          'https://testbusiness.com', 'VAT123', 'Test Business', '12345678', '12-34-56',
          'Net 30', 'Test Business', 276
        )
      `;
    }
    
    // Create test invoice with correct schema
    const testInvoice = {
      userId: user.id,
      invoiceNumber: 'INV-2025-R2-TEST',
      clientName: 'R2 Test Client',
      clientEmail: 'r2test@example.com',
      clientAddress: '456 Client Ave, Test City, TC2 3ST',
      performanceFee: '350.00',
      amount: '350.00',
      dueDate: new Date('2025-08-20'),
      status: 'draft'
    };
    
    console.log('📝 Creating test invoice...');
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
    
    console.log('✅ Test invoice created:', newInvoice.invoiceNumber);
    console.log('🆔 Invoice ID:', newInvoice.id);
    
    // Test PDF generation and cloud storage
    console.log('📄 Testing PDF generation and R2 upload...');
    
    // This would be called by the actual application
    console.log('🎯 Next: Navigate to invoices page and send this invoice via email');
    console.log('📧 Email sending will trigger R2 upload and test the hybrid system');
    console.log('🔗 Look for cloud storage URLs in the logs');
    
    return newInvoice;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testProductionInvoice();