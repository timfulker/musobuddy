// Test the fixed webhook endpoint
console.log('🔍 TESTING FIXED WEBHOOK ENDPOINT...');

async function testWebhookEndpoint() {
  try {
    console.log('1. Testing GET request...');
    const getResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid');
    const getData = await getResponse.json();
    console.log('✅ GET Response:', getData);
    
    console.log('\n2. Testing POST request (simulating SendGrid)...');
    const postResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'SendGrid-Webhook'
      },
      body: JSON.stringify({
        to: 'leads@musobuddy.com',
        from: 'timfulkermusic@gmail.com',
        subject: 'Test after routing fix',
        text: 'Testing webhook after fixing routing middleware',
        envelope: { 
          from: 'timfulkermusic@gmail.com', 
          to: ['leads@musobuddy.com'] 
        }
      })
    });
    
    if (postResponse.status === 200) {
      const postData = await postResponse.json();
      console.log('✅ POST Response:', postData);
      console.log('🎉 Webhook is working! Ready for real emails.');
    } else {
      console.log('❌ POST failed:', postResponse.status);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testWebhookEndpoint();