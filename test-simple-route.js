/**
 * Test if routes are being registered at all
 */

async function testSimpleRoute() {
  console.log('🔍 Testing simple route registration...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/test-route', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Response JSON:', responseJson);
      
      if (responseJson.message) {
        console.log('✅ ROUTES ARE BEING REGISTERED!');
        console.log('✅ Route registration working correctly');
      } else {
        console.log('❌ Route not working as expected');
      }
    } catch (e) {
      console.log('❌ Could not parse JSON response');
      console.log('❌ Response type:', response.headers.get('content-type'));
      console.log('❌ This suggests routes are not being registered properly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Use dynamic import for ES modules
import('node-fetch').then(fetch => {
  global.fetch = fetch.default;
  testSimpleRoute();
}).catch(err => {
  console.error('Error importing fetch:', err);
});