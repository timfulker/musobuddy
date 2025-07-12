/**
 * Check Mailgun route configuration directly
 */

const https = require('https');

async function testWebhookDirectly() {
  console.log('🔍 Testing webhook endpoint directly...');
  
  const testData = JSON.stringify({
    "timestamp": "1752325000",
    "token": "test-token-123",
    "signature": "test-signature-456",
    "subject": "Test during lunch break",
    "from": "test@example.com",
    "to": "leads@musobuddy.com",
    "body-plain": "This is a test email sent during lunch break to verify webhook functionality.",
    "stripped-text": "This is a test email sent during lunch break to verify webhook functionality."
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

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`📊 Webhook Response Status: ${res.statusCode}`);
        console.log(`📝 Response: ${data}`);
        resolve({ status: res.statusCode, data: data });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Webhook Test Error: ${error.message}`);
      resolve({ error: error.message });
    });

    req.write(testData);
    req.end();
  });
}

async function checkCurrentStatus() {
  console.log('🔍 MAILGUN EMAIL FORWARDING STATUS CHECK');
  console.log('=====================================\n');
  
  console.log('📧 Test email sent during lunch break');
  console.log('⏰ Current time: ' + new Date().toISOString());
  console.log('🎯 Expected: New enquiry creation if email forwarding works\n');
  
  // Test webhook directly
  const webhookResult = await testWebhookDirectly();
  
  console.log('\n📋 ANALYSIS:');
  
  if (webhookResult.status === 200) {
    console.log('✅ Webhook endpoint is accessible and working');
    console.log('🔍 Issue likely: Email not reaching webhook from Mailgun');
    console.log('🔧 Next steps: Check Mailgun route configuration');
  } else {
    console.log('❌ Webhook endpoint has issues');
    console.log('🔧 Next steps: Fix webhook endpoint first');
  }
  
  console.log('\n🎯 ROOT CAUSE ANALYSIS:');
  console.log('1. DMARC record exists on Google DNS (Gmail should accept)');
  console.log('2. Webhook endpoint tested: ' + (webhookResult.status === 200 ? 'WORKING' : 'FAILED'));
  console.log('3. Email delivery chain: Gmail → Mailgun → Route → Webhook');
  console.log('4. Most likely issue: Mailgun route configuration or email routing');
}

checkCurrentStatus();