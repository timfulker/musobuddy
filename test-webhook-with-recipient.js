/**
 * Test webhook with proper recipient data to see if filtering is the issue
 */

async function testWebhookWithRecipient() {
  try {
    console.log('🧪 Testing webhook with recipient=leads@musobuddy.com...');
    
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        recipient: 'leads@musobuddy.com',
        sender: 'sarah.johnson@gmail.com',
        subject: 'Wedding Inquiry',
        'body-plain': 'Hi, I\'m interested in booking you for my wedding on August 15th at The Grand Hotel. Please let me know if you\'re available.',
        to: 'leads@musobuddy.com',
        from: 'sarah.johnson@gmail.com'
      })
    });
    
    const result = await response.json();
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', JSON.stringify(result, null, 2));
    
    // Check if enquiry was created
    console.log('\n🔍 Checking for new enquiry...');
    
    const enquiriesResponse = await fetch('https://musobuddy.replit.app/api/enquiries');
    const enquiries = await enquiriesResponse.json();
    
    console.log('📊 Total enquiries:', enquiries.length);
    
    // Find most recent enquiry
    const latestEnquiry = enquiries.sort((a, b) => b.id - a.id)[0];
    console.log('📝 Latest enquiry:', {
      id: latestEnquiry?.id,
      title: latestEnquiry?.title,
      clientName: latestEnquiry?.clientName,
      clientEmail: latestEnquiry?.clientEmail,
      status: latestEnquiry?.status
    });
    
    if (result.success || result.enquiryId) {
      console.log('🎉 SUCCESS: Webhook processed and enquiry created!');
      return true;
    } else {
      console.log('❌ FAILED: Webhook response indicates filtering or error');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testWebhookWithRecipient().then(success => {
  if (success) {
    console.log('\n🎯 DIAGNOSIS: Webhook works when recipient is explicitly leads@musobuddy.com');
    console.log('🎯 ISSUE: Test data may not include proper recipient field');
  } else {
    console.log('\n🎯 DIAGNOSIS: Webhook still has issues even with proper recipient');
    console.log('🎯 ISSUE: Problem is deeper than recipient filtering');
  }
});