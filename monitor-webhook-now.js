/**
 * Monitor webhook for recent activity
 */

console.log('Starting webhook monitoring...');
console.log('Send an email to leads@musobuddy.com now and watch for webhook activity');

let enquiryCount = 0;

async function checkForNewEnquiries() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    if (response.ok) {
      const enquiries = await response.json();
      
      if (enquiries.length > enquiryCount) {
        const newEnquiries = enquiries.slice(enquiryCount);
        console.log(`\n🎉 NEW ENQUIRY DETECTED!`);
        newEnquiries.forEach(enquiry => {
          console.log(`ID: ${enquiry.id}`);
          console.log(`Title: ${enquiry.title}`);
          console.log(`Client: ${enquiry.clientName}`);
          console.log(`Email: ${enquiry.clientEmail}`);
          console.log(`Status: ${enquiry.status}`);
          console.log(`Created: ${enquiry.createdAt || 'N/A'}`);
          console.log('---');
        });
        enquiryCount = enquiries.length;
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] No new enquiries (${enquiries.length} total)`);
      }
    }
  } catch (error) {
    console.log(`Error checking enquiries: ${error.message}`);
  }
}

async function startMonitoring() {
  // Get initial count
  const response = await fetch('https://musobuddy.replit.app/api/enquiries');
  if (response.ok) {
    const enquiries = await response.json();
    enquiryCount = enquiries.length;
    console.log(`Starting with ${enquiryCount} existing enquiries`);
  }
  
  // Check every 10 seconds
  setInterval(checkForNewEnquiries, 10000);
  
  // Also check immediately
  checkForNewEnquiries();
}

startMonitoring();