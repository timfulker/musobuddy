/**
 * Test the actual production endpoint that Mailgun should be hitting
 */

async function testActualEndpoint() {
  console.log('Testing actual Mailgun webhook endpoint...');
  
  // Test with exact Mailgun format
  const formData = new URLSearchParams();
  formData.append('recipient', 'leads@musobuddy.com');
  formData.append('sender', 'realuser@gmail.com');
  formData.append('subject', 'PRODUCTION TEST - Wedding Inquiry');
  formData.append('body-plain', `Hi there,

I'm looking for a musician for my wedding on August 15th, 2025.
The venue is The Grand Ballroom, 456 Wedding Street, London.
We're expecting about 150 guests.

Could you please let me know your availability and rates?

Best regards,
Sarah Thompson
Phone: 07987654321
Email: sarah.thompson@gmail.com`);
  
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
  formData.append('token', 'production-test-token');
  formData.append('signature', 'production-test-signature');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/1.0'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('SUCCESS - Webhook processed:', result);
      if (result.enquiryId) {
        console.log(`Created enquiry #${result.enquiryId}`);
      }
    } else {
      const error = await response.text();
      console.log('FAILED - Response:', error);
    }
    
  } catch (error) {
    console.log('ERROR - Request failed:', error.message);
  }
}

testActualEndpoint();