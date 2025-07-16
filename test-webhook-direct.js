/**
 * Test the webhook directly to see if it's working correctly
 */

console.log('🔍 Testing webhook directly...');

// Test the webhook endpoint to ensure it's accessible
const testWebhook = async () => {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'From': 'Test User <test@example.com>',
        'Subject': 'Test Wedding Enquiry',
        'body-plain': 'Hello, I need a saxophonist for my wedding on August 15th, 2025 at The Grand Hotel in Brighton. My phone is 07123 456789 and budget is £300-£400.',
        'timestamp': '1642636800',
        'token': 'test-token',
        'signature': 'test-signature'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook is accessible and responding');
    } else {
      console.log('❌ Webhook returned error status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
  }
};

testWebhook();