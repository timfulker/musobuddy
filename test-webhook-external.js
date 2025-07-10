/**
 * Test webhook endpoint externally
 */

import https from 'https';

function testWebhookEndpoint() {
  console.log('=== TESTING WEBHOOK ENDPOINT EXTERNALLY ===');
  
  // Test GET request first
  const getUrl = 'https://musobuddy.replit.app/api/webhook/mailgun';
  console.log('Testing GET request to:', getUrl);
  
  https.get(getUrl, (res) => {
    console.log('GET Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('GET Response:', data);
      
      // Now test POST request
      testPostRequest();
    });
  }).on('error', (err) => {
    console.error('GET Error:', err.message);
  });
}

function testPostRequest() {
  console.log('\n=== TESTING POST REQUEST ===');
  
  const postData = JSON.stringify({
    recipient: 'leads@musobuddy.com',
    sender: 'external-test@example.com',
    subject: 'External Test',
    'body-plain': 'This is an external test of the webhook endpoint'
  });
  
  const options = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/mailgun',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };
  
  const req = https.request(options, (res) => {
    console.log('POST Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('POST Response:', data);
    });
  });
  
  req.on('error', (err) => {
    console.error('POST Error:', err.message);
  });
  
  req.write(postData);
  req.end();
}

testWebhookEndpoint();