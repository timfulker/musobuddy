/**
 * Test contract signing debugging logs
 */

async function testContractSigningDebug() {
  console.log('🧪 Testing contract signing debugging logs...');
  
  try {
    // Make a request to the contract signing endpoint with test data
    const response = await fetch('http://localhost:5000/api/contracts/sign/999', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientName: 'Test Client',
        signature: 'test-signature-data'
      })
    });
    
    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
    
    if (response.status === 404) {
      console.log('✅ Expected 404 - Contract not found (testing debug logs)');
    } else {
      console.log('❌ Unexpected response status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error testing contract signing:', error);
  }
}

testContractSigningDebug();