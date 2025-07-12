/**
 * Simple webhook test to verify email processing
 */

async function testWebhook() {
  console.log('🔍 TESTING SIMPLE EMAIL WEBHOOK');
  
  const formData = new URLSearchParams({
    sender: 'tim@example.com',
    recipient: 'leads@musobuddy.com',
    subject: 'Test Email From Tim',
    'body-plain': 'Hi, I need a musician for my wedding on July 15th. Please contact me.',
  });
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook response:', result);
      
      // Now check if we can see this enquiry
      console.log('\n🔍 CHECKING IF ENQUIRY WAS CREATED...');
      console.log(`Check your dashboard for enquiry #${result.enquiryId}`);
      console.log(`Title should be: "Email: Test Email From Tim"`);
      console.log(`Client should be: "tim"`);
      
    } else {
      const error = await response.text();
      console.log('❌ Webhook failed:', error);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testWebhook();