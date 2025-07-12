/**
 * Test Mailgun webhook endpoint
 */

async function testMailgunWebhook() {
  console.log('🔍 Testing Mailgun webhook endpoint...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'sender=test@example.com&subject=Test Email&body-plain=Test message&recipient=leads@musobuddy.com'
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Response JSON:', responseJson);
      
      if (responseJson.success) {
        console.log('✅ WEBHOOK IS WORKING!');
        console.log('✅ Enquiry ID:', responseJson.enquiryId);
        console.log('✅ EMAIL FORWARDING IS OPERATIONAL!');
      } else {
        console.log('❌ Webhook returned error:', responseJson);
      }
    } catch (e) {
      console.log('❌ Could not parse JSON response');
      console.log('❌ Raw response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Use dynamic import for ES modules
import('node-fetch').then(fetch => {
  global.fetch = fetch.default;
  testMailgunWebhook();
});