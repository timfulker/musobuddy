/**
 * Test the new priority webhook route to see if it's working
 */

async function testPriorityWebhook() {
  console.log('🔍 Testing NEW priority webhook route...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun-priority', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'sender=test@example.com&subject=Priority Test&body-plain=This is a priority webhook test&recipient=leads@musobuddy.com'
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
        console.log('✅ NEW PRIORITY ROUTE IS WORKING!');
        console.log('✅ Enquiry ID:', responseJson.enquiryId);
        console.log('✅ Processing mode:', responseJson.processing);
      } else if (responseJson.processing === 'priority-ultra-safe-mode') {
        console.log('✅ PRIORITY ULTRA-SAFE MODE IS WORKING!');
      } else if (responseJson.message && responseJson.message.includes('PRIORITY')) {
        console.log('✅ PRIORITY ROUTE DETECTED!');
      } else {
        console.log('❌ Priority route not working - wrong handler called');
        console.log('❌ Response:', responseJson);
      }
    } catch (e) {
      console.log('❌ Could not parse JSON response');
      console.log('❌ Raw response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPriorityWebhook();