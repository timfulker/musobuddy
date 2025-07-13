/**
 * Test webhook directly to see what's working
 */

async function testWebhookDirect() {
  console.log('Testing webhook with real email format...');
  
  const testData = {
    sender: 'timfulkermusic@gmail.com',
    from: 'timfulkermusic@gmail.com',
    subject: 'Test from direct webhook call',
    'body-plain': 'Hi, my name is Tim Fulker. I need a saxophone player for my wedding on August 15th at The Grand Hotel. Please contact me on 07123 456789. Thank you!',
    text: 'Hi, my name is Tim Fulker. I need a saxophone player for my wedding on August 15th at The Grand Hotel. Please contact me on 07123 456789. Thank you!'
  };
  
  try {
    console.log('Sending to webhook...');
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(testData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success! Created enquiry:', result.enquiryId);
      console.log('📧 Client name:', result.clientName);
      console.log('📧 Extracted data:', result.extracted);
    } else {
      const error = await response.text();
      console.log('❌ Error:', error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testWebhookDirect();