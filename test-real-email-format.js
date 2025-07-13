/**
 * Test webhook with real email format that matches your previous emails
 */

async function testRealEmailFormat() {
  console.log('Testing webhook with real email format...');
  
  const testData = {
    sender: 'timfulkermusic@gmail.com',
    subject: 'Wedding Enquiry - August 15th',
    'body-plain': 'Hi, I am looking for a saxophonist for my wedding on August 15th at The Grand Hotel. My name is Sarah Johnson and you can reach me at 07123 456789. Please let me know if you are available. Thanks!'
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(testData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Real email format test successful!');
      console.log('Response:', result);
      console.log('Created enquiry ID:', result.enquiryId);
      console.log('Client name extracted:', result.clientName);
      console.log('Enhanced parsing data:', result.extracted);
    } else {
      console.log('❌ Test failed:', response.status);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testRealEmailFormat();