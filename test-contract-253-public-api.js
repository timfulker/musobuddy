/**
 * Test the public API endpoint for contract 253 to see if it's working
 */

async function testPublicContractAPI() {
  try {
    console.log('🔍 Testing public contract API for contract 253...');
    
    // Test the public API endpoint
    const response = await fetch('http://localhost:5000/api/contracts/public/253');
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const contractData = await response.json();
      console.log('✅ API call successful!');
      console.log('📄 Contract data:', contractData);
      console.log('🎯 Contract status:', contractData.status);
      console.log('📅 Signed at:', contractData.signedAt);
    } else {
      const errorText = await response.text();
      console.log('❌ API call failed:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

// Run the test
testPublicContractAPI();