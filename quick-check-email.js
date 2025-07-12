/**
 * Quick check for new enquiry after DMARC test
 */

async function quickCheck() {
  console.log('🔍 Checking for your DMARC test email...');
  
  const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sender: 'check@test.com',
      subject: 'Check after DMARC',
      'body-plain': 'Getting latest count'
    })
  });
  
  const result = await response.json();
  console.log(`📊 Current enquiry ID: ${result.enquiryId}`);
  
  if (result.enquiryId > 237) {
    console.log(`🎉 NEW ENQUIRY DETECTED! ID: ${result.enquiryId}`);
    console.log('Check your dashboard to see if it shows correct email data');
    console.log('- Look for subject: "DMARC test email"');
    console.log('- Look for your actual email address');
  } else {
    console.log('❌ No new enquiry detected yet');
    console.log('Email may still be processing or DMARC fix may need more time');
  }
}

quickCheck();