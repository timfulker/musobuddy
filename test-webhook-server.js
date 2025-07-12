import https from 'https';
import querystring from 'querystring';

async function testWebhookServer() {
  const postData = querystring.stringify({
    sender: 'john@example.com',
    subject: 'Wedding Enquiry',
    'body-plain': 'Hi, I am interested in booking you for my wedding on 15/06/2025 at The Grand Hotel. Please let me know if you are available.',
    from: 'john@example.com'
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/webhook/mailgun',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    },
    rejectUnauthorized: false
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        console.log('📧 Webhook server test result:');
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        resolve(data);
      });
    });

    req.on('error', (err) => {
      console.error('📧 Request error:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

testWebhookServer().then(() => {
  console.log('✅ Webhook server test completed');
}).catch((err) => {
  console.error('❌ Webhook server test failed:', err);
});