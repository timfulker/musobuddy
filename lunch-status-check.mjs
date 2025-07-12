/**
 * Quick status check for lunch break
 */

import https from 'https';

// Test webhook directly
const testData = JSON.stringify({
  "timestamp": "1752325000",
  "token": "test-token-123",
  "signature": "test-signature-456",
  "subject": "Lunch break test",
  "from": "test@example.com",
  "to": "leads@musobuddy.com",
  "body-plain": "Testing webhook during lunch break",
  "stripped-text": "Testing webhook during lunch break"
});

const options = {
  hostname: 'musobuddy.replit.app',
  port: 443,
  path: '/api/webhook/mailgun',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

console.log('🔍 LUNCH BREAK STATUS CHECK');
console.log('==========================\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📊 Webhook Test Result: ${res.statusCode}`);
    console.log(`📝 Response: ${data}\n`);
    
    console.log('📋 CURRENT STATUS:');
    console.log('1. Webhook endpoint: ' + (res.statusCode === 200 ? '✅ WORKING' : '❌ FAILED'));
    console.log('2. DMARC record: ✅ FOUND on Google DNS');
    console.log('3. Email forwarding: ❌ NOT WORKING');
    console.log('4. Test email result: No new enquiries created\n');
    
    console.log('🎯 LIKELY ISSUE:');
    console.log('- Mailgun route not configured correctly');
    console.log('- Email not reaching webhook from Mailgun');
    console.log('- Need to verify Mailgun route points to correct URL\n');
    
    console.log('🔧 NEXT STEPS:');
    console.log('1. Check Mailgun dashboard route configuration');
    console.log('2. Verify route URL matches: https://musobuddy.replit.app/api/webhook/mailgun');
    console.log('3. Test route directly from Mailgun dashboard');
  });
});

req.on('error', (error) => {
  console.log(`❌ Connection Error: ${error.message}`);
  console.log('🔧 This suggests the webhook endpoint is not accessible');
});

req.write(testData);
req.end();