/**
 * Simple DNS check using Node.js built-in dns module
 */

import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

async function checkDNS() {
  console.log('=== DNS VERIFICATION ===');
  
  try {
    // Check MX records
    console.log('Checking MX records for musobuddy.com...');
    const mxRecords = await resolveMx('musobuddy.com');
    
    console.log('MX Records:');
    mxRecords.forEach(record => {
      console.log(`  Priority: ${record.priority}, Exchange: ${record.exchange}`);
    });
    
    // Check if SendGrid MX is present
    const hasSendGrid = mxRecords.some(record => record.exchange.includes('sendgrid.net'));
    console.log(`\n✅ SendGrid MX record: ${hasSendGrid ? 'FOUND' : 'NOT FOUND'}`);
    
    // Check A records
    console.log('\nChecking A records for musobuddy.com...');
    const aRecords = await resolve4('musobuddy.com');
    console.log('A Records:');
    aRecords.forEach(ip => {
      console.log(`  ${ip}`);
    });
    
  } catch (error) {
    console.error('DNS lookup failed:', error.message);
  }
  
  console.log('\n=== ANALYSIS ===');
  console.log('If MX records point to SendGrid and webhook is working,');
  console.log('the issue is likely in SendGrid\'s internal routing.');
}

checkDNS();