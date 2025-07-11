/**
 * Test case sensitivity for Replit URLs
 */

console.log('Testing case sensitivity for Replit URLs...');

const testUrls = [
  'https://musobuddy.replit.app/api/webhook/mailgun',
  'https://Musobuddy.replit.app/api/webhook/mailgun'
];

const testData = new URLSearchParams({
  sender: 'test@example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'Case Sensitivity Test',
  'body-plain': 'Testing case sensitivity for webhook URLs'
});

async function testUrl(url) {
  try {
    console.log(`\nTesting: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun'
      },
      body: testData
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, data);
    
    if (data.enquiryId) {
      console.log(`✅ SUCCESS: Created enquiry #${data.enquiryId}`);
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

async function runTests() {
  for (const url of testUrls) {
    await testUrl(url);
  }
}

runTests();