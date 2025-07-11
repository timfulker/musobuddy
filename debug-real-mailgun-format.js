/**
 * Test webhook with real Mailgun email format
 * This simulates exactly what Mailgun sends for real emails
 */

async function testRealMailgunFormat() {
  console.log('🔍 TESTING REAL MAILGUN EMAIL FORMAT');
  
  // Real Mailgun webhook format (form-data, not JSON)
  const formData = new FormData();
  formData.append('recipient', 'leads@musobuddy.com');
  formData.append('sender', 'client@example.com');
  formData.append('subject', 'Wedding Booking Inquiry');
  formData.append('body-plain', `Hi there,

I'm looking for a musician for my wedding on June 15th, 2025.
The venue is The Grand Hotel, 123 Main Street, London.
We're expecting about 100 guests.

Could you please let me know your availability and rates?

Best regards,
Sarah Johnson
Phone: 07123456789
Email: sarah@example.com`);
  
  formData.append('body-html', `<div>
<p>Hi there,</p>
<p>I'm looking for a musician for my wedding on June 15th, 2025.</p>
<p>The venue is The Grand Hotel, 123 Main Street, London.</p>
<p>We're expecting about 100 guests.</p>
<p>Could you please let me know your availability and rates?</p>
<p>Best regards,<br>
Sarah Johnson<br>
Phone: 07123456789<br>
Email: sarah@example.com</p>
</div>`);
  
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
  formData.append('token', 'test-token-123');
  formData.append('signature', 'test-signature');
  
  console.log('Testing with real Mailgun form-data format...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Mailgun/2.0'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Real Mailgun format processed successfully:', result);
      
      if (result.enquiryId) {
        console.log(`🎉 Created enquiry #${result.enquiryId}`);
        console.log('✅ Webhook handles real Mailgun format correctly!');
      } else {
        console.log('❌ Real format reached webhook but failed to create enquiry');
        console.log('🔍 Debug info:', result);
      }
    } else {
      const error = await response.text();
      console.log('❌ Real Mailgun format failed:', error);
      console.log('🔍 THIS IS LIKELY THE ISSUE - webhook expects different format!');
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  console.log('\n📧 MAILGUN SENDS FORM-DATA, NOT JSON');
  console.log('If this test fails, it means the webhook expects JSON but Mailgun sends form-data');
  console.log('This would explain why test emails work but real emails fail!');
}

testRealMailgunFormat();