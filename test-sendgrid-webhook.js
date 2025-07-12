/**
 * Test SendGrid webhook endpoint
 */

async function testSendGridWebhook() {
  console.log('🔍 Testing SendGrid webhook endpoint...');
  
  // Test SendGrid webhook format
  const response = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SendGrid-Webhook'
    },
    body: new URLSearchParams({
      to: 'leads@musobuddy.com',
      from: 'test@gmail.com',
      subject: 'SendGrid Test Email',
      text: 'Testing SendGrid webhook functionality',
      html: '<p>Testing SendGrid webhook functionality</p>',
      envelope: JSON.stringify({
        to: ['leads@musobuddy.com'],
        from: 'test@gmail.com'
      })
    })
  });
  
  console.log(`Response status: ${response.status}`);
  
  if (response.ok) {
    const result = await response.json();
    console.log('✅ SendGrid webhook working!');
    console.log('Response:', JSON.stringify(result, null, 2));
  } else {
    console.log('❌ SendGrid webhook failed');
    const error = await response.text();
    console.log('Error:', error);
  }
}

testSendGridWebhook();