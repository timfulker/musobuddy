/**
 * Monitor for new enquiry after DMARC fix
 */

async function monitorEmailTest() {
  console.log('🔍 Monitoring for your DMARC test email...');
  
  // Get current enquiry count
  const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
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
  
  const result = await testResponse.json();
  const startingCount = result.enquiryId;
  
  console.log(`📊 Starting enquiry count: ${startingCount}`);
  console.log('🎯 Send your test email now!');
  console.log('');
  console.log('Subject: "DMARC test email"');
  console.log('Body: "Testing email forwarding after DMARC fix"');
  console.log('');
  console.log('Watching for new enquiries...');
  
  // Check for new enquiries every 10 seconds
  const interval = setInterval(async () => {
    const checkResponse = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        sender: 'checker@test.com',
        subject: 'Check count',
        'body-plain': 'Checking for new enquiries'
      })
    });
    
    const checkResult = await checkResponse.json();
    const currentCount = checkResult.enquiryId;
    
    if (currentCount > startingCount + 1) { // +1 for our check request
      console.log(`🎉 NEW ENQUIRY DETECTED! ID: ${currentCount}`);
      console.log('Check your dashboard to see if it shows:');
      console.log('- Subject: "DMARC test email"');
      console.log('- Your actual email address');
      console.log('- Body: "Testing email forwarding after DMARC fix"');
      clearInterval(interval);
    }
  }, 10000);
  
  // Stop monitoring after 5 minutes
  setTimeout(() => {
    clearInterval(interval);
    console.log('⏰ Monitoring stopped after 5 minutes');
  }, 300000);
}

monitorEmailTest();