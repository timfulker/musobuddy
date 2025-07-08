// Monitor for real email activity
console.log('👀 MONITORING FOR REAL EMAILS...');
console.log('Watching for webhook activity...');
console.log('Send your test emails to leads@musobuddy.com now');
console.log('');

let startTime = Date.now();
let emailCount = 0;

// Check enquiries every 5 seconds to see if new ones appear
setInterval(async () => {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    const enquiries = await response.json();
    
    // Filter enquiries created since we started monitoring
    const recentEnquiries = enquiries.filter(enquiry => {
      const enquiryTime = new Date(enquiry.createdAt || 0).getTime();
      return enquiryTime > startTime;
    });
    
    if (recentEnquiries.length > emailCount) {
      const newEnquiries = recentEnquiries.slice(emailCount);
      emailCount = recentEnquiries.length;
      
      console.log(`🎯 NEW EMAIL ENQUIRY DETECTED!`);
      newEnquiries.forEach(enquiry => {
        console.log(`   ID: ${enquiry.id}`);
        console.log(`   Title: ${enquiry.title}`);
        console.log(`   Client: ${enquiry.clientName}`);
        console.log(`   Email: ${enquiry.clientEmail}`);
        console.log(`   Source: ${enquiry.source}`);
        console.log(`   Time: ${new Date(enquiry.createdAt || Date.now()).toLocaleTimeString()}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.log('Error checking enquiries:', error.message);
  }
}, 5000);

console.log('Monitoring started. Press Ctrl+C to stop.');
console.log('This will show any new enquiries that appear from your email tests.');