/**
 * Regenerate contract 0123 signing link with correct date format
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function regenerateContract0123() {
  try {
    console.log('🔍 Finding contract 0123...');
    
    // Find contract 0123
    const contracts = await sql`
      SELECT id, contract_number, event_date, client_name, venue, status, cloud_storage_key
      FROM contracts 
      WHERE contract_number = '0123'
      LIMIT 1
    `;
    
    if (contracts.length === 0) {
      console.log('❌ Contract 0123 not found');
      return;
    }
    
    const contract = contracts[0];
    console.log(`📄 Found contract 0123:`);
    console.log(`   ID: ${contract.id}`);
    console.log(`   Event Date: ${new Date(contract.event_date).toLocaleDateString('en-GB')} (UK format)`);
    console.log(`   Client: ${contract.client_name}`);
    console.log(`   Venue: ${contract.venue}`);
    console.log(`   Status: ${contract.status}`);
    console.log(`   Cloud Storage Key: ${contract.cloud_storage_key}`);
    
    // Make API call to regenerate the link
    console.log('\n🔄 Regenerating contract signing link...');
    
    const response = await fetch(`http://localhost:5000/api/contracts/${contract.id}/regenerate-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AyourSessionCookie' // This would normally come from browser
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Link regenerated successfully!');
      console.log(`🔗 New signing URL: ${result.signingUrl}`);
      console.log('\n🎯 The new signing page will now display dates in DD/MM/YYYY format');
    } else {
      console.log('❌ Failed to regenerate link:', await response.text());
      console.log('\n💡 ALTERNATIVE SOLUTION:');
      console.log('In the MusoBuddy admin panel:');
      console.log('1. Go to Contracts page');
      console.log('2. Find contract 0123');
      console.log('3. Click the "Regenerate Link" button');
      console.log('4. The new link will have the correct DD/MM/YYYY date format');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n💡 MANUAL SOLUTION:');
    console.log('Use the "Regenerate Link" button in the MusoBuddy admin panel for contract 0123');
    console.log('This will create a new cloud signing page with the correct UK date format');
  }
}

// Run the regeneration
regenerateContract0123();