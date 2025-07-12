/**
 * Test webhook with absolutely minimal data to isolate the toISOString error
 */

async function testMinimalWebhook() {
  try {
    console.log('🧪 Testing webhook with minimal data...');
    
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        sender: 'test@example.com',
        subject: 'Test',
        'body-plain': 'Test message'
      })
    });
    
    const result = await response.json();
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', JSON.stringify(result, null, 2));
    
    if (result.error && result.error.includes('toISOString')) {
      console.log('🎯 CONFIRMED: toISOString error occurs even with minimal data');
      console.log('🎯 ISSUE: The error is in the storage layer, not the webhook data processing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMinimalWebhook();