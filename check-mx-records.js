/**
 * Check MX records for musobuddy.com
 */

import { promises as dns } from 'dns';

async function checkMXRecords() {
  console.log('=== MX RECORD VERIFICATION ===');
  
  try {
    // Check MX records using Node.js DNS module
    console.log('Checking MX records for musobuddy.com...');
    const mxRecords = await dns.resolveMx('musobuddy.com');
    
    if (mxRecords.length > 0) {
      console.log('✅ MX Records found:');
      mxRecords.forEach((record, index) => {
        console.log(`${index + 1}. Priority: ${record.priority}, Exchange: ${record.exchange}`);
      });
      
      // Check if Mailgun MX records are present
      const mailgunMx = mxRecords.filter(record => 
        record.exchange.includes('mailgun.org')
      );
      
      if (mailgunMx.length > 0) {
        console.log('\n✅ Mailgun MX records confirmed - DNS is ready!');
        console.log('📧 You can test email forwarding immediately.');
      } else {
        console.log('\n⚠️  No Mailgun MX records found');
      }
    } else {
      console.log('❌ No MX records found');
    }
  } catch (error) {
    console.error('Error checking MX records:', error.message);
  }
}

checkMXRecords();