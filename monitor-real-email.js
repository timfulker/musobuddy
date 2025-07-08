// Monitor for real email from timfulkermusic@gmail.com
console.log('👀 MONITORING FOR REAL EMAIL FROM timfulkermusic@gmail.com');
console.log('Watching server logs for webhook activity...');
console.log('Time:', new Date().toLocaleTimeString());

let attempts = 0;
const maxAttempts = 10;

async function checkForWebhookActivity() {
  attempts++;
  console.log(`\nCheck ${attempts}/${maxAttempts} - ${new Date().toLocaleTimeString()}`);
  
  try {
    // Test if webhook is responsive
    const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid');
    const testData = await testResponse.json();
    
    if (testResponse.status === 200) {
      console.log('✅ Webhook endpoint responsive');
    } else {
      console.log('❌ Webhook endpoint issue:', testResponse.status);
    }
    
    // Check for recent enquiries with authentication
    const enquiriesResponse = await fetch('https://musobuddy.replit.app/api/enquiries');
    
    if (enquiriesResponse.status === 200) {
      const enquiries = await enquiriesResponse.json();
      const recentEnquiries = enquiries.filter(e => 
        new Date(e.createdAt) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      );
      
      if (recentEnquiries.length > 0) {
        console.log('🎯 RECENT ENQUIRIES FOUND:');
        recentEnquiries.forEach(enquiry => {
          console.log(`   #${enquiry.id}: ${enquiry.clientEmail} - "${enquiry.title}"`);
          if (enquiry.clientEmail?.includes('timfulkermusic')) {
            console.log('   🎉 THIS IS YOUR EMAIL! Email forwarding worked!');
          }
        });
      } else {
        console.log('⏳ No recent enquiries - email may still be processing');
      }
    } else {
      console.log('❌ Cannot check enquiries:', enquiriesResponse.status);
    }
    
  } catch (error) {
    console.log('❌ Monitor error:', error.message);
  }
  
  if (attempts < maxAttempts) {
    setTimeout(checkForWebhookActivity, 30000); // Check every 30 seconds
  } else {
    console.log('\n📧 Monitoring complete. If no enquiry appeared, check:');
    console.log('1. Email may be delayed by Gmail/SendGrid processing');
    console.log('2. Check your sent folder for bounce messages');
    console.log('3. Try sending from a different email provider');
  }
}

// Start monitoring
checkForWebhookActivity();