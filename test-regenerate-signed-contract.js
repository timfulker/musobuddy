/**
 * Test regenerating signing link for signed contract 253
 * This should generate a cloud signing page that shows "Contract Already Signed" message
 */

import { neon } from '@neondatabase/serverless';
import { uploadContractSigningPage } from './server/cloud-storage.js';

async function testRegenerateSignedContract() {
  try {
    console.log('🧪 Testing regenerate link for signed contract 253...');
    
    // Get the signed contract from database
    const sql = neon(process.env.DATABASE_URL);
    const contracts = await sql`SELECT * FROM contracts WHERE id = 253`;
    
    if (contracts.length === 0) {
      console.log('❌ Contract not found');
      return;
    }
    
    const contract = contracts[0];
    console.log('📋 Contract details:');
    console.log(`  - ID: ${contract.id}`);
    console.log(`  - Number: ${contract.contract_number}`);
    console.log(`  - Status: ${contract.status}`);
    console.log(`  - Client: ${contract.client_name}`);
    console.log(`  - Signed At: ${contract.signed_at}`);
    
    // Get user settings
    const userSettings = await sql`SELECT * FROM user_settings WHERE user_id = ${contract.user_id}`;
    const settings = userSettings[0] || null;
    
    console.log('\n☁️ Generating new cloud signing page...');
    
    // Generate new cloud signing page 
    const result = await uploadContractSigningPage(contract, settings);
    
    console.log('✅ Cloud signing page generated successfully!');
    console.log(`🔗 URL: ${result.url}`);
    console.log(`🗝️ Storage key: ${result.storageKey}`);
    
    console.log('\n🎯 Expected behavior when visiting the URL:');
    console.log('✅ Shows "Contract Already Signed" message');
    console.log('✅ Hides contract details section');
    console.log('✅ Hides signing form');
    console.log('✅ Shows download button');
    console.log('✅ No JavaScript API calls needed');
    
    console.log('\n🔧 Technical implementation:');
    console.log('- Contract status is embedded directly in HTML');
    console.log('- Elements are hidden/shown using inline styles');
    console.log('- No cross-origin API calls required');
    console.log('- Works independently of app availability');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRegenerateSignedContract();