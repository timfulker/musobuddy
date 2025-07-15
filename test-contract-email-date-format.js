/**
 * Test contract email date formatting to identify the American format issue
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function testContractEmailDateFormat() {
  try {
    console.log('🔍 Testing contract email date formatting...');
    
    // Test the exact date from your screenshot: 12/23/2025
    const testDate = new Date('2025-12-23');
    
    console.log('📅 Date object:', testDate);
    console.log('📅 Default format:', testDate.toLocaleDateString());
    console.log('📅 US format:', testDate.toLocaleDateString('en-US'));
    console.log('📅 UK format:', testDate.toLocaleDateString('en-GB'));
    
    // Test with different timezone interpretations
    const testDateWithTime = new Date('2025-12-23T00:00:00.000Z');
    console.log('\n📅 With UTC time:');
    console.log('📅 Default format:', testDateWithTime.toLocaleDateString());
    console.log('📅 US format:', testDateWithTime.toLocaleDateString('en-US'));
    console.log('📅 UK format:', testDateWithTime.toLocaleDateString('en-GB'));
    
    // Check if there's a contract with this date
    const testContract = await sql`
      SELECT contract_number, event_date, client_name, venue, fee
      FROM contracts 
      WHERE event_date::date = '2025-12-23'
      LIMIT 1
    `;
    
    if (testContract.length > 0) {
      const contract = testContract[0];
      console.log('\n📄 Found contract with test date:', contract.contract_number);
      console.log('📅 DB date:', contract.event_date);
      console.log('📅 JS Date:', new Date(contract.event_date));
      console.log('📅 Default format:', new Date(contract.event_date).toLocaleDateString());
      console.log('📅 UK format:', new Date(contract.event_date).toLocaleDateString('en-GB'));
    }
    
    // Test the exact JavaScript environment's default locale
    console.log('\n🌍 Environment locale information:');
    console.log('Default locale:', Intl.DateTimeFormat().resolvedOptions().locale);
    console.log('Default timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testContractEmailDateFormat();