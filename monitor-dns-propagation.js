/**
 * Monitor DNS propagation for Mailgun MX records
 */

import { promises as dns } from 'dns';

async function checkDNSPropagation() {
  console.log('=== DNS PROPAGATION MONITOR ===');
  console.log('Checking MX records for musobuddy.com...');
  
  try {
    const mxRecords = await dns.resolveMx('musobuddy.com');
    
    console.log('✅ MX Records found:');
    mxRecords.forEach((record, index) => {
      console.log(`${index + 1}. Priority: ${record.priority}, Exchange: ${record.exchange}`);
    });
    
    // Check if Mailgun MX records are present
    const mailgunMx = mxRecords.filter(record => 
      record.exchange.includes('mailgun.org')
    );
    
    if (mailgunMx.length > 0) {
      console.log('\n🎉 MAILGUN MX RECORDS ACTIVE!');
      console.log('📧 Email forwarding should now work.');
      console.log('✅ Ready to test: Send email to leads@musobuddy.com');
      return true;
    } else {
      console.log('\n⚠️ No Mailgun MX records found yet');
      return false;
    }
    
  } catch (error) {
    if (error.code === 'ENODATA') {
      console.log('❌ No MX records found yet - DNS still propagating');
    } else {
      console.error('Error checking DNS:', error.message);
    }
    return false;
  }
}

async function monitorUntilReady() {
  console.log('Starting DNS propagation monitoring...');
  console.log('Will check every 5 minutes until MX records are active.\n');
  
  let attempt = 1;
  const maxAttempts = 288; // 24 hours worth of 5-minute checks
  
  while (attempt <= maxAttempts) {
    console.log(`\n--- Attempt ${attempt} (${new Date().toLocaleTimeString()}) ---`);
    
    const isReady = await checkDNSPropagation();
    
    if (isReady) {
      console.log('\n🚀 DNS PROPAGATION COMPLETE!');
      console.log('Email forwarding is now ready for testing.');
      break;
    }
    
    if (attempt < maxAttempts) {
      console.log(`\n⏳ Waiting 5 minutes before next check...`);
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000)); // 5 minutes
    }
    
    attempt++;
  }
  
  if (attempt > maxAttempts) {
    console.log('\n❌ DNS propagation taking longer than expected');
    console.log('Check your DNS settings in Namecheap');
  }
}

// Run single check or continuous monitoring
const args = process.argv.slice(2);
if (args.includes('--monitor')) {
  monitorUntilReady();
} else {
  checkDNSPropagation();
}