/**
 * Test webhook endpoint directly
 */

const https = require('https');

async function testWebhook() {
  console.log('Testing webhook endpoint...');
  
  // First test GET endpoint
  const getOptions = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/sendgrid',
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  };
  
  const getReq = https.request(getOptions, (res) => {
    console.log('GET Response status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('GET Response:', data);
      
      // Now test POST endpoint
      const postData = JSON.stringify({
        from: 'test@example.com',
        to: 'leads@musobuddy.com',
        subject: 'Direct webhook test',
        text: 'Testing webhook directly'
      });
      
      const postOptions = {
        hostname: 'musobuddy.replit.app',
        port: 443,
        path: '/api/webhook/sendgrid',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const postReq = https.request(postOptions, (postRes) => {
        console.log('POST Response status:', postRes.statusCode);
        let postData = '';
        postRes.on('data', (chunk) => {
          postData += chunk;
        });
        postRes.on('end', () => {
          console.log('POST Response:', postData);
        });
      });
      
      postReq.on('error', (e) => {
        console.error('POST Error:', e.message);
      });
      
      postReq.write(postData);
      postReq.end();
    });
  });
  
  getReq.on('error', (e) => {
    console.error('GET Error:', e.message);
  });
  
  getReq.end();
}

testWebhook();