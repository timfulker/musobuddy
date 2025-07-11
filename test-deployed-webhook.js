/**
 * Test the deployed webhook endpoint
 */

async function testDeployedWebhook() {
  console.log('Testing deployed webhook with enhanced field mapping...');
  
  // Test with real Mailgun email format
  const realEmailData = {
    to: 'leads@musobuddy.com',
    from: 'sarah.johnson@gmail.com',
    subject: 'Wedding Reception Inquiry',
    text: 'Hello! I am planning my wedding reception for September 20th at the Riverside Hotel. Would you be available to provide music for the evening? My phone is 555-987-6543. Thank you! Sarah Johnson'
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Real-Email-Test/1.0'
      },
      body: JSON.stringify(realEmailData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS:', result);
      
      if (result.enquiryId) {
        console.log(`🎉 Created enquiry #${result.enquiryId}`);
        console.log(`📧 Client: ${result.clientName}`);
        console.log(`🔄 Test data: ${result.isTestData ? 'YES' : 'NO'}`);
        console.log(`⏱️ Processing time: ${result.processingTime}ms`);
      }
    } else {
      const error = await response.text();
      console.log('❌ ERROR:', error);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testDeployedWebhook();