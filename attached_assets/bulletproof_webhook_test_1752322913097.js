// Bulletproof webhook test script
async function testBulletproofWebhook() {
  console.log('🧪 === BULLETPROOF WEBHOOK TEST START ===');
  
  // Test data that simulates real Mailgun webhook
  const testData = {
    sender: 'sarah.johnson@gmail.com',
    recipient: 'leads@musobuddy.com',
    subject: 'Wedding Booking Enquiry for September 20th',
    'body-plain': `Hello,

My name is Sarah Johnson and I would like to enquire about booking you for my wedding.

Event Details:
- Date: September 20th, 2025
- Venue: The Grand Hotel, Manchester
- Time: 7:00 PM
- Contact: 07123 456789

Please let me know your availability and pricing.

Best regards,
Sarah Johnson`,
    timestamp: Math.floor(Date.now() / 1000), // Unix timestamp
    token: 'test-token-12345',
    signature: 'test-signature-abcde'
  };

  try {
    console.log('🧪 Sending test webhook request...');
    console.log('🧪 Test data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/Test'
      },
      body: new URLSearchParams(testData)
    });

    console.log('🧪 Response status:', response.status);
    console.log('🧪 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('🧪 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook test SUCCESSFUL!');
      
      try {
        const responseData = JSON.parse(responseText);
        if (responseData.enquiryId) {
          console.log('✅ Enquiry created with ID:', responseData.enquiryId);
          console.log('✅ Processing time:', responseData.processingTime);
        }
      } catch (parseError) {
        console.log('📄 Response was not JSON, but request succeeded');
      }
      
      // Verify enquiry was actually created
      console.log('🔍 Verifying enquiry creation...');
      try {
        const enquiriesResponse = await fetch('https://musobuddy.replit.app/api/enquiries');
        if (enquiriesResponse.ok) {
          const enquiries = await enquiriesResponse.json();
          console.log('🔍 Total enquiries:', enquiries.length);
          
          const latestEnquiry = enquiries[0]; // Assuming sorted by creation date
          if (latestEnquiry && latestEnquiry.clientName === 'Sarah Johnson') {
            console.log('✅ Verification successful - enquiry found:');
            console.log('  - ID:', latestEnquiry.id);
            console.log('  - Client:', latestEnquiry.clientName);
            console.log('  - Email:', latestEnquiry.clientEmail);
            console.log('  - Venue:', latestEnquiry.venue);
            console.log('  - Event Date:', latestEnquiry.eventDate);
          } else {
            console.log('⚠️ Latest enquiry does not match test data');
          }
        }
      } catch (verifyError) {
        console.log('⚠️ Could not verify enquiry creation:', verifyError.message);
      }
      
    } else {
      console.log('❌ Webhook test FAILED!');
      console.log('❌ Status:', response.status);
      console.log('❌ Response:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Test request failed:', error.message);
  }
  
  console.log('🧪 === BULLETPROOF WEBHOOK TEST END ===');
}

// Run the test
testBulletproofWebhook().catch(console.error);