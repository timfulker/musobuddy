/**
 * Regenerate cloud signing pages with correct date format
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function regenerateCloudSigningPages() {
  try {
    console.log('🔄 Checking contracts that need cloud signing page regeneration...');
    
    // Find contracts that have cloud signing pages but need date format fix
    const contracts = await sql`
      SELECT id, contract_number, event_date, client_name, venue, fee, cloud_storage_key
      FROM contracts 
      WHERE cloud_storage_key IS NOT NULL 
      AND status = 'sent'
      ORDER BY event_date DESC
      LIMIT 5
    `;
    
    console.log(`📋 Found ${contracts.length} contracts with cloud signing pages`);
    
    for (const contract of contracts) {
      console.log(`\n📄 Contract ${contract.contract_number}:`);
      console.log(`   Event Date: ${new Date(contract.event_date).toLocaleDateString('en-GB')} (UK format)`);
      console.log(`   Event Date: ${new Date(contract.event_date).toLocaleDateString()} (Default format)`);
      console.log(`   Client: ${contract.client_name}`);
      console.log(`   Venue: ${contract.venue}`);
      console.log(`   Cloud Storage Key: ${contract.cloud_storage_key}`);
      
      if (contract.contract_number === '0123') {
        console.log('   🎯 This is the contract from the screenshot!');
        console.log('   The cloud signing page needs to be regenerated with the correct date format');
      }
    }
    
    console.log('\n💡 SOLUTION:');
    console.log('The cloud signing pages are static HTML files stored in R2 that were created BEFORE the date format fix.');
    console.log('They need to be regenerated using the "Regenerate Link" button in the MusoBuddy admin panel.');
    console.log('This will create new cloud signing pages with the correct DD/MM/YYYY date format.');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
regenerateCloudSigningPages();