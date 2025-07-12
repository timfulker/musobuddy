/**
 * Check if your latest email created a new enquiry
 */

async function checkLatestEnquiry() {
  console.log('🔍 Checking for your latest email...');
  
  // Test webhook to get current enquiry count
  const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sender: 'counter@test.com',
      subject: 'Counter check',
      'body-plain': 'Getting current count'
    })
  });
  
  const result = await response.json();
  const currentId = result.enquiryId;
  
  console.log(`📊 Latest enquiry ID: ${currentId}`);
  
  if (currentId > 231) {
    console.log(`🎉 YOUR EMAIL WORKED! New enquiry ID: ${currentId}`);
    console.log('Check your dashboard to see if the subject and content are correct');
    
    // Check if it has the correct subject
    if (result.subject && result.subject.includes('Testing fixed webhook')) {
      console.log('✅ Subject parsing is working!');
    } else {
      console.log('❌ Subject parsing still needs work');
    }
    
  } else {
    console.log('❌ Your email did not create a new enquiry');
    console.log('This means it either failed or is taking time to process');
  }
}

checkLatestEnquiry();