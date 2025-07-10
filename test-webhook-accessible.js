/**
 * Test webhook endpoint accessibility
 */

import https from 'https';

async function testWebhookEndpoint() {
  console.log('Testing webhook endpoint accessibility...');
  
  // Test GET request first
  const getOptions = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/sendgrid',
    method: 'GET'
  };

  console.log('Testing GET request...');
  
  const getRequest = https.request(getOptions, (res) => {
    console.log(`GET Status: ${res.statusCode}`);
    console.log(`GET Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('GET Response:', data);
      testPostRequest();
    });
  });

  getRequest.on('error', (error) => {
    console.error('GET Error:', error);
  });

  getRequest.end();
}

function testPostRequest() {
  console.log('\nTesting POST request...');
  
  const postData = 'to=leads@musobuddy.com&from=test@example.com&subject=Test&text=Test webhook';
  
  const postOptions = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/sendgrid',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'SendGrid/Test'
    }
  };

  const postRequest = https.request(postOptions, (res) => {
    console.log(`POST Status: ${res.statusCode}`);
    console.log(`POST Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('POST Response:', data);
    });
  });

  postRequest.on('error', (error) => {
    console.error('POST Error:', error);
  });

  postRequest.write(postData);
  postRequest.end();
}

testWebhookEndpoint();