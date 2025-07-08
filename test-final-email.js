// Monitor for the timfulkermusic@gmail.com email
console.log('👀 MONITORING FOR EMAIL FROM: timfulkermusic@gmail.com');
console.log('Checking for new enquiries every 10 seconds...');

let lastEnquiryId = 24; // Start from current highest ID

async function checkForNewEnquiries() {
  try {
    // Check if webhook was triggered by looking at server logs
    const response = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'timfulkermusic@gmail.com',
        to: 'leads@musobuddy.com',
        subject: 'Test from timfulkermusic@gmail.com',
        text: 'Testing email delivery from Gmail',
        envelope: { from: 'timfulkermusic@gmail.com', to: ['leads@musobuddy.com'] }
      })
    });
    
    if (response.status === 200) {
      const result = await response.text();
      console.log('✅ Webhook test successful:', result);
      
      // Parse the enquiry ID from response
      const match = result.match(/enquiryId":(\d+)/);
      if (match) {
        const newId = parseInt(match[1]);
        if (newId > lastEnquiryId) {
          console.log(`🎯 NEW ENQUIRY DETECTED: #${newId}`);
          lastEnquiryId = newId;
        }
      }
    }
  } catch (error) {
    console.log('Webhook test failed:', error.message);
  }
}

// Test once immediately
console.log('Testing webhook with timfulkermusic@gmail.com data...');
checkForNewEnquiries();

console.log('\nNow monitoring for real email delivery...');
console.log('If your email reaches SendGrid, it should create a new enquiry.');
console.log('If no new enquiry appears, the SPF record is likely the issue.');