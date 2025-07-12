/**
 * Test the ultra-safe webhook route (first in app)
 */

async function testUltraSafeWebhook() {
  console.log('🔍 Testing ULTRA-SAFE webhook route...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun-ultra-safe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'sender=test@example.com&subject=Ultra Safe Test&body-plain=This is an ultra-safe webhook test&recipient=leads@musobuddy.com'
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Response JSON:', responseJson);
      
      // Check for our specific response markers
      if (responseJson.route === 'first-in-app') {
        console.log('✅ ULTRA-SAFE ROUTE IS WORKING!');
        console.log('✅ Enquiry ID:', responseJson.enquiryId);
        console.log('✅ Processing mode:', responseJson.processing);
        console.log('✅ Client name:', responseJson.clientName);
        console.log('✅ SUCCESS! The ultra-safe webhook is working perfectly!');
      } else if (responseJson.processing === 'ultra-safe-mode') {
        console.log('✅ ULTRA-SAFE MODE IS WORKING!');
      } else if (responseJson.message && responseJson.message.includes('ULTRA-SAFE')) {
        console.log('✅ ULTRA-SAFE ROUTE DETECTED!');
      } else {
        console.log('❌ Ultra-safe route not working - wrong handler called');
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

testUltraSafeWebhook();