/**
 * Test SendGrid webhook with exact request format
 */

async function testSendGridWebhook() {
  console.log('🔍 Testing SendGrid webhook after architecture fix...');
  
  // Test with exact SendGrid format
  const response = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SendGrid-Webhook',
      'X-Forwarded-For': '192.168.1.1'
    },
    body: new URLSearchParams({
      to: 'leads@musobuddy.com',
      from: 'real-test@gmail.com',
      subject: 'Architecture Fix Test',
      text: 'Testing after fixing duplicate webhook registration',
      html: '<p>Testing after fixing duplicate webhook registration</p>',
      envelope: JSON.stringify({
        to: ['leads@musobuddy.com'],
        from: 'real-test@gmail.com'
      }),
      headers: JSON.stringify({
        'Received': 'from mail.gmail.com',
        'Message-ID': '<test@gmail.com>',
        'Date': new Date().toISOString()
      })
    })
  });
  
  console.log(`Response status: ${response.status}`);
  
  if (response.ok) {
    const result = await response.json();
    console.log('✅ SendGrid webhook working after architecture fix!');
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('');
    console.log('🎯 Now test with real email:');
    console.log('Send email to leads@musobuddy.com with subject "Final Architecture Test"');
    console.log('The webhook should now receive real emails from external sources');
  } else {
    console.log('❌ SendGrid webhook still failing');
    const error = await response.text();
    console.log('Error:', error);
  }
}

testSendGridWebhook();