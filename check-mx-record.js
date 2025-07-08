/**
 * Quick MX Record Check for musobuddy.com
 */

import dns from 'dns';

async function checkMXRecord() {
  console.log('Checking MX record for musobuddy.com...');
  
  try {
    const mxRecords = await dns.promises.resolveMx('musobuddy.com');
    console.log('MX Records found:', mxRecords);
    
    const sendgridMx = mxRecords.find(r => r.exchange === 'mx.sendgrid.net');
    
    if (sendgridMx) {
      console.log('✅ SendGrid MX Record FOUND:');
      console.log(`   Exchange: ${sendgridMx.exchange}`);
      console.log(`   Priority: ${sendgridMx.priority}`);
      console.log('\n✅ This means MX record is working from DNS perspective');
      console.log('   But it needs to be visible in Namecheap control panel too');
    } else {
      console.log('❌ SendGrid MX Record NOT FOUND');
      console.log('   This is why email forwarding is not working');
    }
    
  } catch (error) {
    console.log('❌ Error checking MX record:', error.message);
    console.log('   This suggests no MX record exists');
  }
}

checkMXRecord();