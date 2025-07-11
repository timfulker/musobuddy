/**
 * Test Mailgun webhook endpoint with complete data including recipient
 */

const webhook_url = 'https://musobuddy.replit.app/api/webhook/mailgun';

console.log('Testing Mailgun webhook with complete data...');

// Test with complete data (like a real Mailgun email would send)
const testData = new URLSearchParams({
  sender: 'client@example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'Wedding Inquiry - July 15th',
  'body-plain': 'Hi there! I am looking for a musician for my wedding on July 15th at the Town Hall. My name is Sarah Johnson and my phone number is 555-1234. Please let me know if you are available. Thanks!'
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