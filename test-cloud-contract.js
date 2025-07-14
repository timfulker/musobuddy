/**
 * Test cloud storage contract signing page upload
 */

// Test contract data
const testContract = {
  id: '244',
  contractNumber: 'CON-2025-001',
  clientName: 'John Smith',
  clientEmail: 'timfulkermusic@gmail.com',
  eventDate: '2025-04-20',
  eventTime: '7pm',
  venue: 'Home',
  performanceFee: '150',
  deposit: '0',
  terms: 'Payment in cash or by bank transfer',
  userId: 'user-test'
};

const testSettings = {
  businessName: 'Tim Fulker',
  emailFromName: 'Tim Fulker'
};

console.log('Testing cloud storage contract signing page upload...');

// Check environment variables
const required = ['R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_ACCOUNT_ID', 'R2_BUCKET_NAME'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.log('❌ Missing required environment variables:', missing);
  process.exit(1);
}

console.log('✅ All environment variables present');
console.log('🔧 Testing cloud storage upload...');

// Test the cloud storage upload function
async function testCloudUpload() {
  try {
    // Import the cloud storage module
    const { uploadContractSigningPage } = await import('./server/cloud-storage.js');
    
    console.log('📦 Cloud storage module loaded successfully');
    
    // Upload the contract signing page
    const cloudUrl = await uploadContractSigningPage(testContract, testSettings);
    
    console.log('✅ SUCCESS: Contract signing page uploaded to cloud storage');
    console.log('🔗 Cloud signing URL:', cloudUrl);
    
    // Verify the URL format
    if (cloudUrl.includes('amazonaws.com')) {
      console.log('✅ Cloud URL format is correct (contains amazonaws.com)');
    } else {
      console.log('⚠️ WARNING: Cloud URL does not appear to be from cloud storage');
    }
    
    console.log('🎉 Cloud storage test completed successfully!');
    
  } catch (error) {
    console.error('❌ Cloud storage test failed:', error);
    console.error('🔧 Error details:', error.message);
    if (error.stack) {
      console.error('📚 Stack trace:', error.stack);
    }
  }
}

testCloudUpload();