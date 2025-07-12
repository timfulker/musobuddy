/**
 * Check what's actually in the latest enquiries
 */

async function checkEnquiryDetails() {
  console.log('🔍 Checking latest enquiry details...');
  
  // Send a test webhook to compare
  console.log('Sending test webhook...');
  const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sender: 'test@example.com',
      subject: 'Test webhook call',
      'body-plain': 'Test message content'
    })
  });
  
  if (testResponse.ok) {
    console.log('✅ Test webhook succeeded');
  } else {
    console.log('❌ Test webhook failed:', testResponse.status);
  }
  
  // Check if we can identify the difference between test and real emails
  console.log('\n📧 Latest enquiry should be #234 (test) vs #233 (your real email)');
  console.log('Check your dashboard to compare the data in these two enquiries');
  console.log('If #234 shows "Test webhook call" but #233 shows "No Subject",');
  console.log('then Mailgun is using different field names than our test format.');
}

checkEnquiryDetails();