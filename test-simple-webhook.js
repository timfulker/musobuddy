/**
 * Test simple email webhook endpoint
 */

async function testSimpleWebhook() {
  console.log('🔍 TESTING SIMPLE WEBHOOK');
  
  const testData = new URLSearchParams({
    sender: 'test@example.com',
    recipient: 'leads@musobuddy.com',
    subject: 'Simple Test Email',
    'body-plain': 'This is a test email to see if the webhook works.'
  });
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: testData
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS:', result);
    } else {
      const error = await response.text();
      console.log('❌ ERROR:', error);
    }
    
  } catch (error) {
    console.log('❌ REQUEST FAILED:', error.message);
  }
}

testSimpleWebhook();