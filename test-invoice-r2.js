/**
 * Test invoice creation with R2 integration
 */

// Set environment variables
process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq';
process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'Hkmu_3Tbqq2DYHLo24b8oMAoV2vHbLcGTOOFHq';
process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'a730a594e40d8b4629555407dc8e4413';
process.env.CLOUDFLARE_R2_BUCKET_NAME = 'musobuddy-documents';
process.env.CLOUDFLARE_R2_ENDPOINT = 'https://a730a594e40d8b4629555407dc8e4413.r2.cloudflarestorage.com';

import { createInvoice } from './server/storage.js';

async function testInvoiceWithR2() {
  console.log('🧾 Testing invoice creation with R2 storage...');
  
  try {
    // Create test invoice data
    const testInvoiceData = {
      invoiceNumber: 'INV-2025-999',
      clientName: 'R2 Test Client',
      clientEmail: 'test@r2-test.com',
      clientAddress: '123 Test Street, Test City, TE1 2ST',
      performanceFee: '500.00',
      description: 'R2 Storage Test Performance',
      eventDate: '2025-08-15',
      dueDate: '2025-09-15',
      userId: 'test-user-123',
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('📤 Creating invoice with R2 integration...');
    const invoice = await createInvoice(testInvoiceData);
    
    console.log('✅ Invoice created successfully!');
    console.log('📄 Invoice number:', invoice.invoiceNumber);
    
    if (invoice.cloudStorageUrl) {
      console.log('☁️ Cloud storage URL:', invoice.cloudStorageUrl);
      console.log('🔑 Cloud storage key:', invoice.cloudStorageKey);
      console.log('🎉 R2 hybrid storage is working!');
    } else {
      console.log('⚠️ No cloud storage URL - might be using local PDF only');
    }
    
  } catch (error) {
    console.error('❌ Invoice R2 test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testInvoiceWithR2();