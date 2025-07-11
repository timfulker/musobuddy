/**
 * Test enhanced Mailgun webhook handler
 */

const webhook_url = 'https://musobuddy.replit.app/api/webhook/mailgun';

console.log('Testing enhanced Mailgun webhook handler...');

// Test with real email data
const realEmailData = new URLSearchParams({
  sender: 'client@example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'Wedding Booking - August 15th',
  'body-plain': 'Hi! I would like to book you for my wedding on August 15th at the Grand Hotel. My name is Sarah Johnson and my phone is 555-123-4567. Please let me know if you are available!'
});

// Test with test data (no recipient field)
const testData = new URLSearchParams({
  sender: 'test@mailgun.example.com',
  subject: 'Test Email from Mailgun Dashboard',
  'body-plain': 'This is a test email from the Mailgun dashboard to verify webhook functionality.'
});

async function testWebhook(data, testName) {
  try {
    console.log(`\n--- Testing: ${testName} ---`);
    
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun'
      },
      body: data
    });
    
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, result);
    
    if (result.enquiryId) {
      console.log(`✅ SUCCESS: Created enquiry #${result.enquiryId} (${result.isTestData ? 'TEST' : 'REAL'})`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

async function runTests() {
  await testWebhook(realEmailData, 'Real Email Data');
  await testWebhook(testData, 'Test Data (no recipient)');
}

runTests();