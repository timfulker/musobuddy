/**
 * Debug Mailgun route configuration
 */

import https from 'https';
import { promisify } from 'util';

async function checkMailgunRoute() {
  console.log('🔍 Checking Mailgun route configuration...');
  
  // Test if webhook endpoint is accessible
  console.log('\n1. Testing webhook endpoint accessibility:');
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        sender: 'debug@test.com',
        subject: 'Debug test',
        'body-plain': 'Testing webhook accessibility'
      })
    });
    
    const result = await response.json();
    console.log(`✅ Webhook accessible - Status: ${response.status}`);
    console.log(`✅ Response: ${JSON.stringify(result)}`);
  } catch (error) {
    console.log(`❌ Webhook not accessible: ${error.message}`);
  }
  
  // Check MX record
  console.log('\n2. Checking MX record configuration:');
  try {
    const dnsResponse = await fetch('https://dns.google/resolve?name=musobuddy.com&type=MX');
    const dnsData = await dnsResponse.json();
    
    if (dnsData.Answer) {
      console.log('✅ MX records found:');
      dnsData.Answer.forEach(record => {
        console.log(`   ${record.data}`);
      });
    } else {
      console.log('❌ No MX records found');
    }
  } catch (error) {
    console.log(`❌ Error checking MX records: ${error.message}`);
  }
  
  // Check if emails are being delivered to Mailgun
  console.log('\n3. Recommendations:');
  console.log('- Verify Mailgun route is pointing to: https://musobuddy.replit.app/api/webhook/mailgun');
  console.log('- Check if MX record is: mxa.mailgun.org or mxb.mailgun.org (not mx.sendgrid.net)');
  console.log('- Ensure domain is verified in Mailgun dashboard');
  console.log('- Check Mailgun logs for incoming emails');
}

checkMailgunRoute();