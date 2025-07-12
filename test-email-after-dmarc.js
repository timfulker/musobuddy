/**
 * Test email forwarding after DMARC fix
 */

async function testEmailAfterDmarc() {
  console.log('🔍 Testing email forwarding after DMARC fix...');
  
  // Get current enquiry count
  const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sender: 'counter@test.com',
      subject: 'Get current count',
      'body-plain': 'Checking count before real email test'
    })
  });
  
  const result = await testResponse.json();
  const currentCount = result.enquiryId;
  
  console.log(`📊 Current enquiry count: ${currentCount}`);
  console.log('');
  console.log('🎯 DMARC record is live and ready!');
  console.log('');
  console.log('📧 Now send a test email to leads@musobuddy.com with:');
  console.log('   Subject: "DMARC test email"');
  console.log('   Body: "Testing email forwarding after DMARC fix"');
  console.log('');
  console.log('If the DMARC fix worked, the webhook should now receive:');
  console.log('- Correct subject: "DMARC test email"');
  console.log('- Correct sender: your actual email address');
  console.log('- Correct body: "Testing email forwarding after DMARC fix"');
  console.log('');
  console.log('Instead of the previous "No Subject" and "unknown@email.com"');
  
  return currentCount;
}

testEmailAfterDmarc();