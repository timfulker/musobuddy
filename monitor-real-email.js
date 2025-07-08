// Monitor for real email webhook activity
console.log('🔍 MONITORING FOR REAL EMAIL WEBHOOK ACTIVITY...');

async function checkForWebhookActivity() {
  const interval = setInterval(async () => {
    try {
      // Check for new enquiries
      const response = await fetch('https://musobuddy.replit.app/api/enquiries');
      const enquiries = await response.json();
      
      const latest = enquiries.sort((a, b) => b.id - a.id)[0];
      
      if (latest && latest.id > 28) {
        console.log('🎉 NEW ENQUIRY DETECTED!');
        console.log(`ID: ${latest.id}`);
        console.log(`Title: ${latest.title}`);
        console.log(`Status: ${latest.status}`);
        console.log(`Created: ${latest.created_at}`);
        
        // Check if this looks like an email webhook
        if (latest.title.includes('@') || latest.message?.includes('From:')) {
          console.log('✅ This appears to be from email webhook!');
        }
        
        clearInterval(interval);
        process.exit(0);
      } else {
        console.log(`⏳ Still waiting... Latest enquiry is still #${latest?.id || 'none'}`);
      }
    } catch (error) {
      console.log('❌ Error checking enquiries:', error.message);
    }
  }, 3000);
  
  // Stop monitoring after 5 minutes
  setTimeout(() => {
    console.log('⏰ Monitoring timeout after 5 minutes');
    clearInterval(interval);
    process.exit(0);
  }, 300000);
}

checkForWebhookActivity();