/**
 * Test debug endpoint
 */

import https from 'https';

function testDebugEndpoint() {
  console.log('Testing debug endpoint...');
  
  const postData = 'to=leads@musobuddy.com&from=test@example.com&subject=Test Debug&text=Testing debug endpoint';
  
  const options = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/debug',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'DebugTest/1.0'
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.write(postData);
  req.end();
}

testDebugEndpoint();