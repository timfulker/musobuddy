/**
 * Test real email content parsing by sending to webhook directly
 */

async function testRealEmailContent() {
  const testEmailData = {
    from: "sarah.johnson@gmail.com",
    to: "leads@musobuddy.com", 
    subject: "Wedding Saxophone Player Needed - August 15th",
    "body-plain": "Hi, I'm looking for a saxophone player for my wedding on August 15th at The Grand Hotel. My name is Sarah Johnson and my phone is 07123 456789. The ceremony starts at 2pm and we'd like music during the reception too. Please let me know your availability and rates. Thank you!",
    "body-html": "<p>Hi, I'm looking for a saxophone player for my wedding on August 15th at The Grand Hotel.</p><p>My name is Sarah Johnson and my phone is 07123 456789.</p><p>The ceremony starts at 2pm and we'd like music during the reception too.</p><p>Please let me know your availability and rates. Thank you!</p>",
    timestamp: Math.floor(Date.now() / 1000),
    recipient: "leads@musobuddy.com"
  };

  try {
    console.log('🔍 Testing real email content parsing...');
    
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(testEmailData).toString()
    });

    const result = await response.json();
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (result.enquiryId) {
      console.log(`🎯 Enquiry Created: #${result.enquiryId}`);
      console.log(`⏱️ Processing Time: ${result.processingTime}ms`);
      console.log(`📧 From: ${result.from}`);
      console.log(`📝 Subject: ${result.subject}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing email:', error);
  }
}

testRealEmailContent();