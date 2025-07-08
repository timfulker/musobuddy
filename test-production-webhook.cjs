/**
 * Test production SendGrid webhook endpoint
 */
const https = require('https');
const querystring = require('querystring');

async function testProductionWebhook() {
  const testData = querystring.stringify({
    to: 'leads@musobuddy.com',
    from: 'production-test@example.com',
    subject: 'Production Webhook Test',
    text: 'This is a test email to verify the production webhook is working correctly.'
  });

  const options = {
    hostname: 'musobuddy.com',
    port: 443,
    path: '/api/webhook/sendgrid',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(testData),
      'User-Agent': 'SendGrid-Test/1.0'
    },
    timeout: 10000
  };

  console.log('Testing production webhook at https://musobuddy.com/api/webhook/sendgrid');
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response Status: ${res.statusCode}`);
        console.log(`Response Body: ${data}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('✅ Production webhook working correctly!');
          resolve(true);
        } else {
          console.log('❌ Production webhook failed');
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Request failed:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.error('❌ Request timed out');
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(testData);
    req.end();
  });
}

// Run the test
testProductionWebhook().catch(console.error);
