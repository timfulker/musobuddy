/**
 * Test webhook endpoint directly with curl-like approach
 */

import https from 'https';
import http from 'http';
import url from 'url';

const testWebhook = async () => {
  const webhookUrl = 'https://Musobuddy.replit.app/api/webhook/simple-email';
  const data = JSON.stringify({
    from: 'test@example.com',
    to: 'leads@musobuddy.com',
    subject: 'Test Email Forwarding',
    text: 'Hello, I would like to book you for a wedding on July 15th at the Grand Hotel. Please call me at 555-1234. Thanks, John Smith'
  });

  const parsedUrl = url.parse(webhookUrl);
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'User-Agent': 'Test-Webhook-Client'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log('Status:', res.statusCode);
      console.log('Headers:', res.headers);
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log('Response body:', body);
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });

    req.write(data);
    req.end();
  });
};

testWebhook().catch(console.error);