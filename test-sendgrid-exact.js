/**
 * Test SendGrid webhook with exact request format
 */

import https from 'https';
import querystring from 'querystring';

async function testSendGridWebhook() {
  console.log('=== TESTING SENDGRID WEBHOOK WITH EXACT FORMAT ===');
  
  // This is the exact format SendGrid sends
  const sendGridData = {
    to: 'leads@musobuddy.com',
    from: 'timfulker@gmail.com',
    subject: 'Test Wedding Enquiry',
    text: 'Hi, I would like to book you for my wedding on June 15th, 2025. The venue is The Grand Hotel. Please let me know if you are available.',
    html: '<p>Hi, I would like to book you for my wedding on June 15th, 2025. The venue is The Grand Hotel. Please let me know if you are available.</p>',
    envelope: JSON.stringify({
      to: ['leads@musobuddy.com'],
      from: 'timfulker@gmail.com'
    }),
    headers: JSON.stringify({
      'Received': 'by mail.example.com',
      'Date': new Date().toISOString(),
      'Message-ID': '<test@example.com>',
      'Subject': 'Test Wedding Enquiry',
      'From': 'timfulker@gmail.com',
      'To': 'leads@musobuddy.com'
    })
  };

  // Convert to form-encoded data (this is how SendGrid sends it)
  const formData = querystring.stringify(sendGridData);
  
  console.log('Form data length:', formData.length);
  console.log('Form data preview:', formData.substring(0, 200) + '...');
  
  const options = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/sendgrid',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(formData),
      'User-Agent': 'SendGrid-Webhook/1.0'
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Response status: ${res.statusCode}`);
    console.log(`Response headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data);
      
      if (res.statusCode === 200) {
        console.log('✅ WEBHOOK TEST SUCCESSFUL!');
        console.log('🎉 This proves the webhook endpoint is working correctly');
        console.log('📧 If this test works but real emails don\'t, the issue is with SendGrid routing');
      } else {
        console.log('❌ WEBHOOK TEST FAILED');
        console.log('🔍 This indicates an issue with the webhook handler');
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request error:', error);
  });

  req.write(formData);
  req.end();
}

testSendGridWebhook();