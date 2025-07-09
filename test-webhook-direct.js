/**
 * Test webhook accessibility directly
 */

async function testWebhookDirect() {
  console.log('🔍 Testing webhook accessibility...\n');
  
  // Test the current domain
  const testUrls = [
    'https://musobuddy.com/api/webhook/sendgrid',
    'https://musobuddy.replit.app/api/webhook/sendgrid'
  ];
  
  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SendGrid-Event-Webhook/1.0'
        },
        body: 'to=leads@musobuddy.com&from=test@example.com&subject=Test&text=Test message',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      console.log(`Response: ${responseText.substring(0, 100)}...`);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`⏰ Timeout after 5 seconds`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    console.log('---\n');
  }
}

// Run the test
testWebhookDirect().catch(console.error);