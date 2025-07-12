/**
 * Test Mailgun route directly - bypass DNS issues
 */

async function testMailgunRoute() {
  console.log('🔍 Testing Mailgun route configuration...');
  
  // Test data that simulates what Mailgun would send
  const testData = {
    sender: 'test@gmail.com',
    recipient: 'leads@musobuddy.com', 
    subject: 'Wedding Booking Enquiry',
    'body-plain': 'Hello, my name is Sarah Johnson. I would like to book you for our wedding on August 15th at The Grand Hotel. Please contact me at 07123456789.',
    'body-html': '<p>Hello, my name is Sarah Johnson. I would like to book you for our wedding on August 15th at The Grand Hotel. Please contact me at 07123456789.</p>',
    timestamp: Math.floor(Date.now() / 1000),
    token: 'test-token',
    signature: 'test-signature'
  };

  try {
    console.log('📨 Sending test webhook request...');
    
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(testData).toString()
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.text();
      console.log('✅ Success! Response:', result);
      
      // Check if enquiry was created
      const checkResponse = await fetch('https://musobuddy.replit.app/api/enquiries');
      const enquiries = await checkResponse.json();
      
      console.log('📋 Total enquiries now:', enquiries.length);
      
      // Look for the newest enquiry
      const latestEnquiry = enquiries.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      )[0];
      
      if (latestEnquiry) {
        console.log('📝 Latest enquiry:', {
          id: latestEnquiry.id,
          client_name: latestEnquiry.client_name,
          client_email: latestEnquiry.client_email,
          client_phone: latestEnquiry.client_phone,
          event_type: latestEnquiry.event_type,
          venue: latestEnquiry.venue,
          created_at: latestEnquiry.created_at
        });
      }
      
    } else {
      console.log('❌ Error response:', await response.text());
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testMailgunRoute();