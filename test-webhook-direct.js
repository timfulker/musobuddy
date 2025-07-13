/**
 * Test webhook directly to confirm it's working
 */

async function testWebhook() {
  console.log('Testing webhook endpoint...');
  
  const testData = {
    sender: 'test@example.com',
    subject: 'Test webhook after cleanup',
    'body-plain': 'This is a test message to verify webhook is working'
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook test successful!');
      console.log('Response:', result);
      console.log('Created enquiry ID:', result.enquiryId);
    } else {
      console.log('❌ Webhook test failed:', response.status);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testWebhook();