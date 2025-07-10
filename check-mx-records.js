/**
 * Check MX records for musobuddy.com
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkMXRecords() {
  console.log('=== MX RECORD VERIFICATION ===');
  
  try {
    const { stdout, stderr } = await execAsync('dig MX musobuddy.com +short');
    
    if (stderr) {
      console.error('Error:', stderr);
      return;
    }
    
    console.log('MX Records for musobuddy.com:');
    console.log(stdout);
    
    // Check if mx.sendgrid.net is present
    if (stdout.includes('mx.sendgrid.net')) {
      console.log('✅ SendGrid MX record found');
    } else {
      console.log('❌ SendGrid MX record NOT found');
    }
    
    // Also check A record
    console.log('\n=== A RECORD VERIFICATION ===');
    const { stdout: aRecord } = await execAsync('dig A musobuddy.com +short');
    console.log('A Records for musobuddy.com:');
    console.log(aRecord);
    
  } catch (error) {
    console.error('DNS lookup failed:', error);
  }
}

checkMXRecords();