/**
 * Test the actual webhook route to see which handler is being used
 */

async function testWebhookRoute() {
  try {
    console.log('🔍 Testing webhook route to see which handler is being used...');
    
    // Test with minimal data to see the response
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        sender: 'test@example.com',
        recipient: 'leads@musobuddy.com',
        subject: 'Test Email',
        'body-plain': 'This is a test email to check which handler is being used',
        to: 'leads@musobuddy.com',
        from: 'test@example.com'
      }).toString()
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    // Parse JSON if possible
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Parsed response:', responseJson);
      
      // Check which handler responded
      if (responseJson.processing === 'ultra-safe-mode') {
        console.log('✅ Ultra-safe webhook handler is being used');
      } else if (responseJson.message === 'Email ignored - not for leads') {
        console.log('❌ Standard filtering handler is being used');
      } else {
        console.log('❓ Unknown handler response:', responseJson);
      }
    } catch (e) {
      console.log('Response is not JSON:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWebhookRoute();