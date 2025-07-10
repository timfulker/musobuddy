/**
 * Test Mailgun webhook endpoint
 */

import https from 'https';
import { URL } from 'url';

async function testMailgunWebhook() {
  const webhookUrl = 'https://musobuddy.replit.app/api/webhook/mailgun';
  
  const testData = {
    sender: 'test@example.com',
    recipient: 'leads@musobuddy.com',
    subject: 'Test Email from Mailgun',
    'body-plain': 'This is a test email to verify Mailgun webhook functionality. The client wants to book a wedding on June 15th, 2025.',
    timestamp: Math.floor(Date.now() / 1000).toString(),
    token: 'test-token'
  };
  
  console.log('=== TESTING MAILGUN WEBHOOK ===');
  console.log('URL:', webhookUrl);
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  const result = await makeRequest(webhookUrl, 'POST', testData);
  console.log('\n=== RESPONSE ===');
  console.log('Status:', result.statusCode);
  console.log('Body:', result.body);
  
  if (result.statusCode === 200) {
    console.log('\n✅ Webhook test successful!');
  } else {
    console.log('\n❌ Webhook test failed');
  }
}

function makeRequest(url, method, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mailgun-Test-Client',
        ...headers
      }
    };
    
    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (err) => reject(err));
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

testMailgunWebhook().catch(console.error);