/**
 * Quick MX Record Check for musobuddy.com
 */

import dns from 'dns';

async function checkMXRecord() {
  console.log('🔍 Checking MX record for musobuddy.com...\n');
  
  try {
    const mxRecords = await dns.promises.resolveMx('musobuddy.com');
    console.log('MX Records found:');
    
    mxRecords.forEach((record, index) => {
      console.log(`${index + 1}. Priority: ${record.priority}, Exchange: ${record.exchange}`);
    });
    
    // Check if SendGrid MX is present
    const hasSendGrid = mxRecords.some(record => 
      record.exchange.includes('sendgrid.net')
    );
    
    if (hasSendGrid) {
      console.log('\n✅ SendGrid MX record found - should be working');
      console.log('💡 The "550 Mailbox not found" error suggests:');
      console.log('   - Your email client is bypassing SendGrid');
      console.log('   - DNS cache needs to be cleared');
      console.log('   - Try sending from a different email client/server');
    } else {
      console.log('\n❌ SendGrid MX record NOT found');
      console.log('💡 This explains the "550 Mailbox not found" error');
    }
    
  } catch (error) {
    console.error('Error checking MX records:', error);
  }
}

checkMXRecord();