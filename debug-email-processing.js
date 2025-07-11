/**
 * Debug email processing - check if emails reach webhook but fail during scraping
 */

async function debugEmailProcessing() {
  console.log('🔍 DEBUGGING EMAIL PROCESSING FAILURES');
  
  // Test with real email format that might be failing
  const realEmailData = {
    recipient: 'leads@musobuddy.com',
    sender: 'client@example.com',
    subject: 'Wedding Booking Inquiry',
    'body-plain': `Hi,

I'm looking for a musician for my wedding on June 15th, 2025.
The venue is The Grand Hotel, 123 Main Street, London.
We're expecting about 100 guests.

Could you please let me know your availability and rates?

Best regards,
Sarah Johnson
Phone: 07123456789
Email: sarah@example.com`,
    'body-html': `<div>
<p>Hi,</p>
<p>I'm looking for a musician for my wedding on June 15th, 2025.</p>
<p>The venue is The Grand Hotel, 123 Main Street, London.</p>
<p>We're expecting about 100 guests.</p>
<p>Could you please let me know your availability and rates?</p>
<p>Best regards,<br>
Sarah Johnson<br>
Phone: 07123456789<br>
Email: sarah@example.com</p>
</div>`,
    timestamp: new Date().toISOString()
  };
  
  console.log('Testing with realistic email data...');
  
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
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Email processed successfully:', result);
      
      if (result.enquiryId) {
        console.log(`🎉 Created enquiry #${result.enquiryId}`);
        console.log('✅ Email parsing is working correctly!');
      } else {
        console.log('❌ Email reached webhook but failed to create enquiry');
        console.log('🔍 Debug info:', result.debugInfo);
      }
    } else {
      const error = await response.text();
      console.log('❌ Email processing failed:', error);
      console.log('🔍 This could be why real emails aren\'t creating enquiries!');
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
  
  console.log('\n🔧 IF EMAILS ARE REACHING BUT FAILING:');
  console.log('1. Check webhook logs for processing errors');
  console.log('2. Verify email parsing logic handles real email formats');
  console.log('3. Check if client name extraction is failing');
  console.log('4. Verify database insertion is working');
  console.log('5. Check if form validation is too strict');
}

debugEmailProcessing();