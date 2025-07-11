/**
 * Test the deployed webhook endpoint
 */

const webhook_url = 'https://musobuddy.replit.app/api/webhook/mailgun';

console.log('Testing deployed webhook endpoint...');
console.log('URL:', webhook_url);

// Test with realistic email data
const testData = new URLSearchParams({
  sender: 'client@example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'Deployment Test Email',
  'body-plain': 'Testing deployed webhook endpoint with realistic email data.',
  'body-html': '<p>Testing deployed webhook endpoint with realistic email data.</p>',
  'attachment-count': '0',
  timestamp: Math.floor(Date.now() / 1000).toString()
});

async function testDeployedWebhook() {
  try {
    console.log('\nTesting deployed webhook...');
    
    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/2.0'
      },
      body: testData
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, await response.json());
    
    if (response.ok) {
      console.log('✅ Deployed webhook is working correctly');
    } else {
      console.log('❌ Deployed webhook has issues');
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
  }
}

testDeployedWebhook();