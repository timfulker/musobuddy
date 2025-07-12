/**
 * Check if your test email created new enquiries
 */

async function checkEmailTest() {
  console.log('🔍 CHECKING IF YOUR EMAIL CREATED AN ENQUIRY');
  
  // Send a test to get current enquiry ID
  const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sender: 'check@test.com',
      recipient: 'leads@musobuddy.com',
      subject: 'Check current ID',
      'body-plain': 'Getting current enquiry number after real email'
    })
  });
  
  const result = await response.json();
  console.log(`📊 Current enquiry ID: ${result.enquiryId}`);
  
  if (result.enquiryId > 225) {
    console.log('🎉 YOUR EMAIL WORKED! New enquiry detected!');
    console.log(`Check your dashboard for enquiry #${result.enquiryId - 1} or nearby`);
    console.log('Look for title: "Email: Final test email"');
  } else {
    console.log('❌ Your email did not create an enquiry');
    console.log('This means the real email is not reaching the webhook');
  }
}

checkEmailTest();