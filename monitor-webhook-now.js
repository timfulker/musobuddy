/**
 * Monitor webhook for recent activity
 */

async function checkForNewEnquiries() {
  console.log('🔍 CHECKING FOR NEW ENQUIRIES FROM REAL EMAIL');
  
  // Send a test to get current enquiry ID
  const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sender: 'baseline@test.com',
      recipient: 'leads@musobuddy.com',
      subject: 'Baseline check',
      'body-plain': 'Getting current enquiry number'
    })
  });
  
  const testResult = await testResponse.json();
  const baselineId = testResult.enquiryId;
  
  console.log(`📊 Current enquiry ID: ${baselineId}`);
  console.log('🕒 Waiting 5 seconds for real email...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check again
  const checkResponse = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sender: 'check@test.com',
      recipient: 'leads@musobuddy.com',
      subject: 'Check for new',
      'body-plain': 'Checking for new enquiries'
    })
  });
  
  const checkResult = await checkResponse.json();
  const newId = checkResult.enquiryId;
  
  console.log(`📊 New enquiry ID: ${newId}`);
  
  if (newId > baselineId + 1) {
    console.log('🎉 REAL EMAIL DETECTED! Enquiry ID jumped more than expected!');
    console.log(`Gap of ${newId - baselineId - 1} enquiries suggests real email was processed`);
  } else {
    console.log('📧 No real email detected yet');
    console.log('This means either:');
    console.log('1. Real email hasn\'t reached Mailgun yet');
    console.log('2. Mailgun isn\'t forwarding to webhook');
    console.log('3. Email bounced/rejected');
  }
}

async function startMonitoring() {
  console.log('📧 SEND YOUR REAL EMAIL NOW TO: leads@musobuddy.com');
  console.log('📧 Subject: Test from my real email');
  console.log('📧 Body: This is a test email');
  console.log('');
  console.log('⏰ Starting monitoring in 10 seconds...');
  
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  for (let i = 0; i < 6; i++) {
    await checkForNewEnquiries();
    if (i < 5) {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

startMonitoring();