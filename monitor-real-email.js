/**
 * Monitor for new enquiries from your test emails
 */

console.log('Monitoring for new enquiries from your test emails...');

let initialCount = 0;

async function checkForNewEnquiries() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    if (response.ok) {
      const enquiries = await response.json();
      
      if (initialCount === 0) {
        initialCount = enquiries.length;
        console.log(`Starting count: ${initialCount} enquiries`);
        return;
      }
      
      if (enquiries.length > initialCount) {
        const newEnquiries = enquiries.slice(initialCount);
        console.log(`\n🎉 ${newEnquiries.length} NEW ENQUIRY(S) DETECTED!`);
        
        newEnquiries.forEach((enquiry, index) => {
          console.log(`\n${index + 1}. Enquiry #${enquiry.id}`);
          console.log(`   Title: ${enquiry.title}`);
          console.log(`   Client: ${enquiry.clientName}`);
          console.log(`   Email: ${enquiry.clientEmail}`);
          console.log(`   Phone: ${enquiry.clientPhone || 'N/A'}`);
          console.log(`   Event Date: ${enquiry.eventDate || 'N/A'}`);
          console.log(`   Venue: ${enquiry.venue || 'N/A'}`);
          console.log(`   Notes: ${enquiry.notes?.substring(0, 150) || 'N/A'}...`);
          console.log(`   Source: ${enquiry.source || 'Email'}`);
          console.log(`   Status: ${enquiry.status}`);
        });
        
        initialCount = enquiries.length;
        console.log(`\n✅ Total enquiries now: ${enquiries.length}`);
        console.log('✅ Email forwarding system working perfectly!');
      } else {
        console.log(`[${new Date().toLocaleTimeString()}] Waiting... (${enquiries.length} total)`);
      }
    } else {
      console.log('Failed to fetch enquiries');
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

// Check every 5 seconds
setInterval(checkForNewEnquiries, 5000);
checkForNewEnquiries();

// Stop after 3 minutes
setTimeout(() => {
  console.log('\nMonitoring stopped.');
  process.exit(0);
}, 180000);