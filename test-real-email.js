/**
 * Test email forwarding with multiple verification methods
 */

const webhook_url = 'https://musobuddy.replit.app/api/webhook/mailgun';

console.log('Testing email forwarding system...');

// Test 1: Simulate email to leads@musobuddy.com exactly as Mailgun would send it
const mailgunStyleData = new URLSearchParams({
  sender: 'tim@example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'Wedding Inquiry - July 15th',
  'body-plain': 'Hello! I am interested in booking your services for my wedding on July 15th at the Riverside Hotel. Please let me know your availability and pricing. Best regards, Tim Johnson. Phone: 555-0123',
  'body-html': '<p>Hello! I am interested in booking your services for my wedding on July 15th at the Riverside Hotel.</p><p>Please let me know your availability and pricing.</p><p>Best regards,<br>Tim Johnson<br>Phone: 555-0123</p>',
  'attachment-count': '0',
  timestamp: Math.floor(Date.now() / 1000).toString(),
  token: 'test-token-123',
  signature: 'test-signature'
});

async function testEmailForwarding() {
  try {
    console.log('\n=== Testing Email Forwarding ===');
    console.log('Webhook URL:', webhook_url);
    console.log('Simulating email to leads@musobuddy.com...');
    
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/1.0'
      },
      body: mailgunStyleData
    });
    
    console.log(`\nResponse Status: ${response.status}`);
    console.log(`Response Headers:`, Object.fromEntries(response.headers));
    
    const result = await response.json();
    console.log('Response Body:', result);
    
    if (result.enquiryId) {
      console.log(`\n✅ SUCCESS: Email forwarding working!`);
      console.log(`📧 Created enquiry #${result.enquiryId}`);
      console.log(`👤 Client: ${result.clientName}`);
      console.log(`⏱️  Processing time: ${result.processingTime}ms`);
      
      // Now check if we can see the enquiry in the system
      console.log('\nChecking if enquiry appears in system...');
      const enquiryResponse = await fetch(`https://musobuddy.replit.app/api/enquiries`);
      if (enquiryResponse.ok) {
        const enquiries = await enquiryResponse.json();
        const newEnquiry = enquiries.find(e => e.id === result.enquiryId);
        if (newEnquiry) {
          console.log('✅ Enquiry found in system:', newEnquiry.title);
        } else {
          console.log('❌ Enquiry not found in system');
        }
      }
    } else {
      console.log('\n❌ ISSUE: No enquiry created');
      console.log('Response:', result);
    }
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    console.log('Stack:', error.stack);
  }
}

testEmailForwarding();