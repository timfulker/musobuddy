// Minimal test to isolate the toISOString() error
async function testMinimalWebhook() {
  console.log('🔬 === MINIMAL TIMESTAMP ERROR TEST ===');
  
  // Test with absolute minimal data
  const minimalData = {
    sender: 'test@example.com',
    recipient: 'leads@musobuddy.com',
    subject: 'Test',
    'body-plain': 'Test message'
    // NO timestamp field at all
  };

  try {
    console.log('🔬 Testing with minimal data (no timestamp)...');
    
    const response = await fetch('http://localhost:5000/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(minimalData)
    });

    console.log('🔬 Response status:', response.status);
    const responseText = await response.text();
    console.log('🔬 Response:', responseText);
    
    if (response.status === 500 && responseText.includes('toISOString')) {
      console.log('❌ ERROR STILL OCCURS WITH MINIMAL DATA');
      console.log('❌ This means the error is NOT in the webhook data processing');
      console.log('❌ The error is likely in the database/storage layer');
    } else if (response.ok) {
      console.log('✅ MINIMAL DATA TEST PASSED');
      console.log('✅ Now testing with timestamp...');
      
      // Test with timestamp
      const withTimestamp = {
        ...minimalData,
        timestamp: Math.floor(Date.now() / 1000)
      };
      
      const response2 = await fetch('http://localhost:5000/api/webhook/mailgun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(withTimestamp)
      });
      
      console.log('🔬 With timestamp status:', response2.status);
      const responseText2 = await response2.text();
      console.log('🔬 With timestamp response:', responseText2);
      
      if (response2.status === 500 && responseText2.includes('toISOString')) {
        console.log('❌ ERROR OCCURS WHEN TIMESTAMP IS ADDED');
        console.log('❌ The timestamp field is causing the issue');
      }
    } else {
      console.log('❌ Unexpected response:', response.status, responseText);
    }
    
  } catch (error) {
    console.error('🔬 Test request failed:', error.message);
  }
  
  console.log('🔬 === MINIMAL TEST END ===');
}

// Run the minimal test
testMinimalWebhook().catch(console.error);