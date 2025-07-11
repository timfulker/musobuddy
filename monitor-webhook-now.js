/**
 * Monitor webhook for recent activity
 */

async function checkForNewEnquiries() {
  try {
    // Check if webhook was hit by looking for recent enquiries
    const response = await fetch('https://musobuddy.replit.app/api/enquiries', {
      headers: {
        'Cookie': 'connect.sid=s%3A_NKJPzDYvPPzO6SvWzJUqfOmZmQVrPOz.T3YJqtJbL4YuEiVQJIqLnCtKhJlG7qFUZE8ypLZSRjE'
      }
    });
    
    if (response.ok) {
      const enquiries = await response.json();
      console.log(`Current enquiries count: ${enquiries.length}`);
      
      // Show the most recent enquiry
      if (enquiries.length > 0) {
        const latest = enquiries[enquiries.length - 1];
        console.log(`Most recent enquiry: #${latest.id} - ${latest.clientName} - ${latest.title}`);
        console.log(`Created: ${new Date(latest.createdAt).toLocaleString()}`);
        
        // Check if it's very recent (last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (new Date(latest.createdAt) > fiveMinutesAgo) {
          console.log('🎉 RECENT ENQUIRY DETECTED - This could be from your test email!');
          console.log(`Details: ${latest.notes || 'No notes'}`);
        }
      }
    }
  } catch (error) {
    console.log('Error checking enquiries:', error.message);
  }
}

async function startMonitoring() {
  console.log('📧 MONITORING FOR EMAIL WEBHOOK ACTIVITY');
  console.log('Email was sent - checking for webhook hits...');
  
  // Check immediately
  await checkForNewEnquiries();
  
  // Check every 10 seconds for 2 minutes
  let checks = 0;
  const maxChecks = 12; // 2 minutes
  
  const interval = setInterval(async () => {
    checks++;
    console.log(`\n📧 Check #${checks} - Looking for new enquiries...`);
    await checkForNewEnquiries();
    
    if (checks >= maxChecks) {
      clearInterval(interval);
      console.log('\n⏰ Monitoring complete');
      console.log('If no new enquiries appeared, check:');
      console.log('1. Mailgun route configuration');
      console.log('2. Webhook URL accessibility');
      console.log('3. Replit console logs for webhook hits');
    }
  }, 10000);
}

startMonitoring();