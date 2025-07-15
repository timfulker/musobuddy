/**
 * Test cloud signing page generation for already signed contract
 */

const { neon } = require('@neondatabase/serverless');
const { uploadContractSigningPage } = require('./server/cloud-storage');

async function testSignedContractPage() {
  try {
    console.log('🧪 Testing cloud signing page for already signed contract...');
    
    // Get the signed contract from database
    const sql = neon(process.env.DATABASE_URL);
    const contracts = await sql`SELECT * FROM contracts WHERE id = 253`;
    
    if (contracts.length === 0) {
      console.log('❌ Contract not found');
      return;
    }
    
    const contract = contracts[0];
    console.log('📋 Contract status:', contract.status);
    console.log('📅 Signed at:', contract.signed_at);
    console.log('👤 Client:', contract.client_name);
    
    // Get user settings
    const userSettings = await sql`SELECT * FROM user_settings WHERE user_id = ${contract.user_id}`;
    const settings = userSettings[0] || null;
    
    // Generate cloud signing page 
    console.log('☁️ Generating cloud signing page...');
    const result = await uploadContractSigningPage(contract, settings);
    
    console.log('✅ Cloud signing page generated successfully!');
    console.log('🔗 URL:', result.url);
    console.log('🗝️ Storage key:', result.storageKey);
    
    console.log('\n🎯 Expected behavior:');
    console.log('- Page should show "Contract Already Signed" message');
    console.log('- Signing form should be hidden');
    console.log('- Download button should be available');
    console.log('- No JavaScript API calls should be made');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSignedContractPage();