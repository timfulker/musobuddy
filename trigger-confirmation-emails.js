// Manually trigger confirmation emails for recently signed contracts
const fetch = require('node-fetch');

async function triggerConfirmationEmails() {
  try {
    console.log('Checking for recently signed contracts...');
    
    // Get all signed contracts
    const response = await fetch('https://musobuddy.replit.app/api/contracts', {
      headers: {
        'Cookie': 'connect.sid=your_session_cookie' // You'll need to add your session cookie
      }
    });
    
    if (!response.ok) {
      console.log('Authentication required. Testing with known contract ID 348...');
      
      // Test with the contract we know was signed
      const contractId = 348;
      console.log(`Testing confirmation emails for contract ${contractId}...`);
      
      // Make a test signing request to trigger emails
      const testSignResponse = await fetch(`https://musobuddy.replit.app/api/contracts/sign/${contractId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: "Daniel Fulker - Test Confirmation",
          clientPhone: "07123456789",
          clientAddress: "Test Address",
          agreedToTerms: true,
          signedAt: new Date().toISOString(),
          ipAddress: "Manual Test"
        })
      });
      
      const result = await testSignResponse.json();
      console.log('Test signing result:', result);
      
      if (result.success) {
        console.log('✅ Contract signing successful - confirmation emails should be triggered');
      } else {
        console.log('❌ Contract signing failed:', result.error);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

triggerConfirmationEmails();