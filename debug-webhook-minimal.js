#!/usr/bin/env node

/**
 * Minimal webhook test to isolate the toISOString error
 */

import https from 'https';
import querystring from 'querystring';

async function testMinimalWebhook() {
  console.log('🧪 Testing minimal webhook handler...');
  
  // Extremely simple test data
  const testData = {
    sender: 'test@example.com',
    recipient: 'leads@musobuddy.com',
    subject: 'Test',
    'body-plain': 'Test message'
  };

  const postData = querystring.stringify(testData);
  
  const options = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/mailgun',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mailgun/Test'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Response Status:', res.statusCode);
        console.log('Response Body:', data);
        
        try {
          const response = JSON.parse(data);
          console.log('Parsed response:', response);
          resolve(response);
        } catch (error) {
          console.log('Raw response:', data);
          resolve(data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error.message);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

testMinimalWebhook().catch(console.error);