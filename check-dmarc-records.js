/**
 * Check DMARC records for musobuddy.com
 */

import { promises as dns } from 'dns';

async function checkDmarcRecords() {
  console.log('=== CHECKING DMARC RECORDS ===');
  
  try {
    // Check for DMARC record
    console.log('Checking _dmarc.musobuddy.com...');
    const dmarcRecords = await dns.resolveTxt('_dmarc.musobuddy.com');
    
    if (dmarcRecords.length > 0) {
      console.log('✅ DMARC record found:');
      dmarcRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.join('')}`);
      });
    } else {
      console.log('❌ No DMARC record found');
    }
  } catch (error) {
    if (error.code === 'ENOTFOUND') {
      console.log('❌ No DMARC record found (ENOTFOUND)');
    } else {
      console.error('Error checking DMARC:', error.message);
    }
  }
  
  console.log('\n=== RECOMMENDATION ===');
  console.log('If you have an existing DMARC record from SendGrid:');
  console.log('- You can keep it (DMARC is domain-level, not service-specific)');
  console.log('- Or replace it with Mailgun\'s DMARC record');
  console.log('- Both SendGrid and Mailgun can work with the same DMARC policy');
}

checkDmarcRecords();