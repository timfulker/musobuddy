/**
 * Test the exact webhook URL from Mailgun route
 */

const webhook_url = 'https://musobuddy.replit.app/api/webhook/mailgun';

console.log('Testing exact webhook URL from Mailgun route...');
console.log('URL:', webhook_url);

// Test with data similar to what Mailgun would send
const testData = new URLSearchParams({
  sender: 'external-test@example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'External URL Test',
  'body-plain': 'Testing exact URL from Mailgun route configuration'
});

async function testExactURL() {
  try {
    console.log('\nSending POST request to webhook...');
    
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/2.0'
      },
      body: testData
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    
    const result = await response.json();
    console.log('Response:', result);
    
    if (result.enquiryId) {
      console.log(`✅ SUCCESS: Webhook URL working - created enquiry #${result.enquiryId}`);
    } else {
      console.log('⚠️  Response received but no enquiry created');
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    console.log('This suggests the webhook URL is not accessible from external sources');
  }
}

testExactURL();