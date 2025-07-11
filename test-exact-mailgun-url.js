/**
 * Test the exact URL that Mailgun is hitting from the logs
 */

async function testExactMailgunURL() {
  console.log('🔍 TESTING EXACT MAILGUN URL FROM LOGS');
  
  // Test the exact format Mailgun uses
  const formData = new URLSearchParams();
  formData.append('sender', 'timfulkermusic@gmail.com');
  formData.append('recipient', 'leads@musobuddy.com');
  formData.append('subject', 'Test from Mailgun logs format');
  formData.append('body-plain', 'Testing with exact format from Mailgun logs');
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
  
  console.log('Testing URL: https://musobuddy.replit.app/api/webhook/mailgun');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/2.0'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS - Webhook processed:', result);
      console.log(`✅ Created enquiry #${result.enquiryId}`);
    } else {
      const error = await response.text();
      console.log('❌ FAILED - Response:', error);
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

testExactMailgunURL();