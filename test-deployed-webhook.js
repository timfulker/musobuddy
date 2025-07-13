/**
 * Test the deployed webhook endpoint
 */

async function testDeployedWebhook() {
  console.log('🔍 TESTING DEPLOYED WEBHOOK');
  console.log('URL: https://musobuddy.replit.app/api/webhook/mailgun');
  console.log('');
  
  const testData = {
    sender: 'timfulkermusic@gmail.com',
    from: 'timfulkermusic@gmail.com',
    subject: 'Test Webhook Deployment',
    'body-plain': 'Testing if deployed webhook is working',
    to: 'leads@musobuddy.com',
    recipient: 'leads@musobuddy.com'
  };
  
  try {
    console.log('📧 Sending test request to deployed webhook...');
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(testData).toString()
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS - Webhook is working!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ WEBHOOK FAILED');
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('This could indicate:');
    console.log('1. Deployment not complete');
    console.log('2. Network connectivity issues');
    console.log('3. Webhook endpoint not accessible');
  }
}

testDeployedWebhook();