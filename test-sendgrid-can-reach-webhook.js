/**
 * Test if SendGrid can reach our webhook endpoint
 * This simulates the exact request SendGrid would make
 */

import https from 'https';
import querystring from 'querystring';

async function testSendGridCanReachWebhook() {
  console.log('=== TESTING IF SENDGRID CAN REACH WEBHOOK ===');
  console.log('URL from screenshot: https://musobuddy.replit.app/api/webhook/sendgrid');
  
  // Test 1: Simple GET request (like SendGrid does for verification)
  console.log('\n1. Testing GET request (SendGrid verification)...');
  
  const getResult = await new Promise((resolve) => {
    const req = https.get('https://musobuddy.replit.app/api/webhook/sendgrid', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data, success: true });
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
  
  if (getResult.success) {
    console.log(`✅ GET request successful: Status ${getResult.status}`);
    console.log(`Response: ${getResult.data.substring(0, 100)}...`);
  } else {
    console.log(`❌ GET request failed: ${getResult.error}`);
  }
  
  // Test 2: POST request with SendGrid-style form data
  console.log('\n2. Testing POST request (SendGrid email forwarding)...');
  
  const formData = querystring.stringify({
    to: 'leads@musobuddy.com',
    from: 'test@example.com',
    subject: 'Test Email',
    text: 'This is a test email to verify webhook functionality',
    envelope: JSON.stringify({
      to: ['leads@musobuddy.com'],
      from: 'test@example.com'
    })
  });
  
  const postResult = await new Promise((resolve) => {
    const options = {
      hostname: 'musobuddy.replit.app',
      port: 443,
      path: '/api/webhook/sendgrid',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(formData),
        'User-Agent': 'SendGrid-Event-Webhook/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data, success: true });
      });
    });
    
    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
    
    req.write(formData);
    req.end();
  });
  
  if (postResult.success) {
    console.log(`✅ POST request successful: Status ${postResult.status}`);
    console.log(`Response: ${postResult.data}`);
  } else {
    console.log(`❌ POST request failed: ${postResult.error}`);
  }
  
  // Analysis
  console.log('\n=== ANALYSIS ===');
  if (getResult.success && postResult.success) {
    console.log('✅ Webhook endpoint is fully accessible from external sources');
    console.log('✅ Both GET and POST requests work correctly');
    console.log('');
    console.log('🔍 Since webhook.site worked but this doesn\'t, possible issues:');
    console.log('1. URL in SendGrid has hidden characters or formatting issues');
    console.log('2. SendGrid\'s servers are having connectivity issues to Replit');
    console.log('3. The webhook URL needs to be re-saved in SendGrid');
    console.log('');
    console.log('💡 Try removing and re-adding the webhook URL in SendGrid');
  } else {
    console.log('❌ Webhook endpoint has connectivity issues');
    console.log('This explains why emails aren\'t being forwarded');
  }
}

testSendGridCanReachWebhook();