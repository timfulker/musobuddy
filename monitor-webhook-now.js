/**
 * Monitor webhook for recent activity
 */

async function checkForNewEnquiries() {
  console.log('🔍 Checking for new enquiries...');
  
  const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      sender: 'monitor@test.com',
      recipient: 'leads@musobuddy.com',
      subject: 'Monitor check',
      'body-plain': 'Checking current enquiry count'
    })
  });
  
  const result = await testResponse.json();
  console.log(`📊 Latest enquiry ID: ${result.enquiryId}`);
  
  return result.enquiryId;
}

async function startMonitoring() {
  const startingId = await checkForNewEnquiries();
  console.log(`🎯 Starting monitoring from enquiry ID: ${startingId}`);
  console.log('Waiting for your email...');
  
  // Check every 5 seconds for new enquiries
  const interval = setInterval(async () => {
    const currentId = await checkForNewEnquiries();
    if (currentId > startingId) {
      console.log(`🎉 NEW ENQUIRY DETECTED! ID: ${currentId}`);
      console.log('Check your dashboard and console logs for webhook data!');
      clearInterval(interval);
    }
  }, 5000);
  
  // Stop monitoring after 2 minutes
  setTimeout(() => {
    clearInterval(interval);
    console.log('⏰ Monitoring stopped');
  }, 120000);
}

startMonitoring();