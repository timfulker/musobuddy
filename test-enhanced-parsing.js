/**
 * Test enhanced email parsing with proper webhook call
 */

async function testEnhancedParsing() {
  console.log('🔍 Testing enhanced email parsing...');
  
  const formData = new URLSearchParams({
    from: 'sarah.johnson@gmail.com',
    to: 'leads@musobuddy.com',
    subject: 'Wedding Saxophone Player Needed - August 15th',
    'body-plain': 'Hi, I\'m looking for a saxophone player for my wedding on August 15th at The Grand Hotel. My name is Sarah Johnson and my phone is 07123 456789. The ceremony starts at 2pm and we\'d like music during the reception too. Please let me know your availability and rates.',
    recipient: 'leads@musobuddy.com',
    timestamp: Math.floor(Date.now() / 1000).toString()
  });

  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const result = await response.json();
    
    console.log('✅ Response Status:', response.status);
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (result.enquiryId) {
      console.log(`🎯 Enquiry Created: #${result.enquiryId}`);
      console.log(`⏱️ Processing Time: ${result.processingTime}ms`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testEnhancedParsing();