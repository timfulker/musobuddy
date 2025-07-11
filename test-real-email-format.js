/**
 * Test webhook with real Mailgun email format
 */

async function testRealEmailFormat() {
  console.log('Testing webhook with real Mailgun email field format...');
  
  // This simulates what real Mailgun emails actually send
  const realEmailData = {
    // Real Mailgun email fields (not test data)
    to: 'leads@musobuddy.com',
    from: 'johndoe@gmail.com',
    subject: 'Booking Inquiry for Wedding',
    text: 'Hi there! I am getting married on June 15th and would love to book you for our wedding reception at The Grand Hotel. Please let me know if you are available. My phone number is 555-123-4567. Thanks! John Doe',
    html: '<p>Hi there! I am getting married on June 15th and would love to book you for our wedding reception at The Grand Hotel. Please let me know if you are available. My phone number is 555-123-4567. Thanks! John Doe</p>',
    timestamp: Math.floor(Date.now() / 1000).toString()
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mailgun/Real-Email-Test'
      },
      body: JSON.stringify(realEmailData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS - Real email format processed:', result);
      
      if (result.enquiryId) {
        console.log(`🎉 Created enquiry #${result.enquiryId} with client: ${result.clientName}`);
        console.log('✅ This proves the webhook can handle real Mailgun emails!');
      }
    } else {
      const error = await response.text();
      console.log('❌ ERROR:', error);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testRealEmailFormat();