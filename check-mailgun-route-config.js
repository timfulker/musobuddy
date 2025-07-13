/**
 * Check Mailgun route configuration directly
 */

async function testWebhookDirectly() {
  console.log('Testing webhook endpoint directly...');
  
  const testData = {
    sender: 'timfulkermusic@gmail.com',
    subject: 'Test from check script',
    'body-plain': 'Testing webhook directly'
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook is working:', result.enquiryId);
    } else {
      console.log('❌ Webhook failed:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkCurrentStatus() {
  console.log('=== MAILGUN ROUTE CONFIGURATION CHECK ===');
  console.log('');
  console.log('Based on your Mailgun logs showing "OK" status but no webhook activity,');
  console.log('the issue is likely in the Mailgun route configuration.');
  console.log('');
  console.log('🔧 SOLUTION:');
  console.log('1. Go to Mailgun Dashboard → Receiving → Routes');
  console.log('2. Find your route and verify the Action URL is:');
  console.log('   https://musobuddy.replit.app/api/webhook/mailgun');
  console.log('');
  console.log('3. If the URL is different, update it to the correct one above');
  console.log('');
  console.log('4. Make sure Expression is: catch_all()');
  console.log('5. Priority should be: 0');
  console.log('');
  console.log('Let me test the webhook endpoint to confirm it works:');
  
  await testWebhookDirectly();
}

checkCurrentStatus();