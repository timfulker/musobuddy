/**
 * Test different Mailgun webhook formats
 */

const webhook_url = 'https://musobuddy.replit.app/api/webhook/mailgun';

console.log('Testing various Mailgun webhook formats...');

// Test 1: Real email format
const realEmail = new URLSearchParams({
  sender: 'client@example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'Real Wedding Inquiry',
  'body-plain': 'Hi! I would like to book you for my wedding on August 15th.'
});

// Test 2: Test data with no recipient (common in Mailgun test posts)
const testNoRecipient = new URLSearchParams({
  sender: 'test@example.com',
  subject: 'Test Email - No Recipient',
  'body-plain': 'This is test data with no recipient field.'
});

// Test 3: Mailgun dashboard test format
const mailgunTest = new URLSearchParams({
  sender: 'test@mailgun.example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'Mailgun Dashboard Test',
  'body-plain': 'Test from Mailgun dashboard.'
});

async function testFormat(data, testName) {
  try {
    console.log(`\n--- ${testName} ---`);
    console.log('Data:', Object.fromEntries(data));
    
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
  await testFormat(realEmail, 'Real Email Format');
  await testFormat(testNoRecipient, 'Test Data (No Recipient)');
  await testFormat(mailgunTest, 'Mailgun Dashboard Test');
}

runTests();