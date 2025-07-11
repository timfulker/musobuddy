/**
 * Test Mailgun webhook endpoint with fixed validation
 */

const webhook_url = 'https://musobuddy.replit.app/api/webhook/mailgun';

console.log('Testing Mailgun webhook with test data...');

// Test with minimal data (like Mailgun test might send)
const testData = new URLSearchParams({
  sender: 'test@example.com',
  subject: 'Test Email from Webhook',
  'body-plain': 'This is a test email to verify webhook functionality. Client: John Smith, Phone: 555-1234, Event Date: July 15th, Venue: Town Hall'
});

fetch(webhook_url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mailgun'
  },
  body: testData
})
.then(response => response.json())
.then(data => {
  console.log('✅ Webhook response:', data);
  if (data.enquiryId) {
    console.log('🎉 SUCCESS: Enquiry created with ID:', data.enquiryId);
  }
})
.catch(error => {
  console.error('❌ Error:', error);
});