/**
 * Debug test to see if priority webhook route is being hit
 */

async function testPriorityWebhook() {
  console.log('🔍 Testing priority webhook route...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'sender=test@example.com&subject=Priority Test&body-plain=This is a priority webhook test'
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Response JSON:', responseJson);
      
      // Check for our specific response markers
      if (responseJson.route === 'after-registerroutes') {
        console.log('✅ PRIORITY ROUTE IS WORKING!');
      } else if (responseJson.processing === 'priority-ultra-safe-mode') {
        console.log('✅ PRIORITY ULTRA-SAFE MODE IS WORKING!');
      } else if (responseJson.message && responseJson.message.includes('PRIORITY')) {
        console.log('✅ PRIORITY ROUTE DETECTED!');
      } else {
        console.log('❌ Priority route not working - wrong handler called');
      }
    } catch (e) {
      console.log('❌ Could not parse JSON response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPriorityWebhook();