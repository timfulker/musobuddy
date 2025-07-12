/**
 * Test the new webhook endpoint to isolate the issue
 */

import https from 'https';
import querystring from 'querystring';

async function testNewWebhook() {
  const postData = querystring.stringify({
    sender: 'test@example.com',
    subject: 'Test enquiry from new endpoint',
    'body-plain': 'This is a test message to the new webhook endpoint'
  });

  const options = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/mailgun-new',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🔍 Testing NEW webhook endpoint...');
  
  try {
    const result = await testNewWebhook();
    
    console.log('Response status:', result.status);
    console.log('Response data:', result.data);
    
    if (result.status === 200) {
      console.log('✅ NEW webhook endpoint working!');
    } else {
      console.log('❌ NEW webhook endpoint failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main();