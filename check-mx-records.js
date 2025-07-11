/**
 * Check MX records for musobuddy.com
 */

import dns from 'dns';

async function checkMXRecords() {
  try {
    console.log('Checking MX records for musobuddy.com...');
    
    const mxRecords = await dns.promises.resolveMx('musobuddy.com');
    console.log('MX Records:', mxRecords);
    
    // Check if Mailgun MX records are present
    const mailgunMX = mxRecords.some(record => 
      record.exchange.includes('mailgun.org') || 
      record.exchange.includes('mg.musobuddy.com')
    );
    
    if (mailgunMX) {
      console.log('✅ Mailgun MX records found');
    } else {
      console.log('❌ No Mailgun MX records found');
      console.log('This might explain why emails aren\'t reaching Mailgun');
    }
    
  } catch (error) {
    console.error('Error checking MX records:', error.message);
  }
}

checkMXRecords();