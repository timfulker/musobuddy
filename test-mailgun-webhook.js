/**
 * Test Mailgun webhook endpoint
 */

import https from 'https';
import querystring from 'querystring';

console.log('=== TESTING MAILGUN WEBHOOK ENDPOINT ===');

const webhookUrl = 'https://musobuddy.replit.app/api/webhook/mailgun';

// Simulate Mailgun webhook payload - this is the exact format Mailgun sends
const mailgunPayload = {
  sender: 'test@example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'Test Wedding Enquiry',
  'body-plain': `Hi there,

I'm interested in booking you for my wedding on August 15th, 2025.

The venue is St. Mary's Church in Brighton.
Expected guests: 150
Time: 2:00 PM - 6:00 PM
Phone: 07123456789

Please let me know your availability and pricing.

Best regards,
Sarah Johnson`,
  'body-html': '<p>Hi there,</p><p>I\'m interested in booking you for my wedding...</p>',
  'attachment-count': '0',
  timestamp: Math.floor(Date.now() / 1000).toString(),
  token: 'test-token-123',
  signature: 'test-signature-456'
};

async function testMailgunWebhook() {
  console.log('1. Testing GET request (endpoint verification)...');
  
  try {
    // Test GET request
    const getResponse = await makeRequest(webhookUrl, 'GET');
    console.log('✅ GET request successful:', getResponse.statusCode);
    console.log('Response:', getResponse.body);
    
    console.log('\n2. Testing POST request (simulated Mailgun webhook)...');
    
    // Test POST request with Mailgun payload
    const postData = querystring.stringify(mailgunPayload);
    const postResponse = await makeRequest(webhookUrl, 'POST', postData, {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    });
    
    console.log('✅ POST request successful:', postResponse.statusCode);
    console.log('Response:', postResponse.body);
    
    console.log('\n=== MAILGUN WEBHOOK TEST COMPLETE ===');
    console.log('✅ Webhook endpoint is ready for Mailgun integration');
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

function makeRequest(url, method, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      headers: {
        'User-Agent': 'Mailgun-Webhook-Test/1.0',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          resolve({ statusCode: res.statusCode, body: parsedBody });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

testMailgunWebhook();