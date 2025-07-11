/**
 * Test with real form-data format that Mailgun actually sends
 */

async function testRealFormData() {
  console.log('🔍 TESTING REAL MAILGUN FORM-DATA FORMAT');
  
  // Create real form-data payload exactly as Mailgun sends it
  const formData = new URLSearchParams();
  formData.append('recipient', 'leads@musobuddy.com');
  formData.append('sender', 'client@example.com');
  formData.append('subject', 'Wedding Booking Inquiry - Real Form Data Test');
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
  
  console.log('Testing with real form-data format...');
  
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
      console.log('✅ Real form-data processed successfully:', result);
      
      if (result.enquiryId) {
        console.log(`🎉 Created enquiry #${result.enquiryId} with client: ${result.clientName}`);
        console.log('✅ This proves the webhook can handle real Mailgun form-data!');
      } else {
        console.log('❌ Form-data reached webhook but failed to create enquiry');
        console.log('🔍 Debug info:', result);
      }
    } else {
      const error = await response.text();
      console.log('❌ Real form-data failed:', error);
      console.log('🔍 This could explain why real emails don\'t create enquiries!');
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  console.log('\n🔧 IF THIS WORKS BUT REAL EMAILS DON\'T:');
  console.log('1. Check Mailgun route configuration exactly');
  console.log('2. Verify webhook URL is accessible from Mailgun servers');
  console.log('3. Check if real emails have different field names');
  console.log('4. Verify Mailgun account is upgraded and working');
}

testRealFormData();