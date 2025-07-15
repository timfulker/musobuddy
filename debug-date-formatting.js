/**
 * Debug date formatting to identify any anomalies
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function debugDateFormatting() {
  try {
    console.log('🔍 Debugging date formatting...');
    
    // Check current contracts with their dates
    const contracts = await sql`
      SELECT id, contract_number, event_date, client_name, venue, status
      FROM contracts 
      WHERE status != 'draft'
      ORDER BY event_date DESC
      LIMIT 10
    `;
    
    console.log('📄 Contract dates analysis:');
    for (const contract of contracts) {
      const originalDate = contract.event_date;
      const jsDate = new Date(originalDate);
      const ukFormat = jsDate.toLocaleDateString('en-GB');
      const isoFormat = jsDate.toISOString();
      
      console.log(`\n${contract.contract_number}:`);
      console.log(`  Original DB value: ${originalDate}`);
      console.log(`  JS Date object: ${jsDate}`);
      console.log(`  UK format (DD/MM/YYYY): ${ukFormat}`);
      console.log(`  ISO format: ${isoFormat}`);
      console.log(`  Timezone offset: ${jsDate.getTimezoneOffset()} minutes`);
      
      // Check if date is off by one day due to timezone
      const utcDate = new Date(originalDate + 'T00:00:00.000Z');
      const utcUkFormat = utcDate.toLocaleDateString('en-GB');
      console.log(`  UTC interpretation: ${utcUkFormat}`);
      
      if (ukFormat !== utcUkFormat) {
        console.log(`  ⚠️  TIMEZONE ANOMALY DETECTED! ${ukFormat} vs ${utcUkFormat}`);
      }
    }
    
    // Test specific date parsing patterns
    console.log('\n🧪 Testing date parsing patterns:');
    
    const testDates = [
      '2025-08-15', // Standard format
      '2025-08-15T00:00:00.000Z', // UTC format
      '2025-08-15T23:59:59.999Z', // Late UTC
      new Date('2025-08-15'), // JS Date constructor
    ];
    
    for (const testDate of testDates) {
      const jsDate = new Date(testDate);
      const ukFormat = jsDate.toLocaleDateString('en-GB');
      console.log(`  ${testDate} → ${ukFormat}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugDateFormatting();