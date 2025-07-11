/**
 * Debug what's actually hitting our webhook
 */

console.log('Monitoring ALL webhook endpoints for actual incoming data...');

// Check the most recent enquiries to see what format was received
async function checkRecentEnquiries() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    if (response.ok) {
      const enquiries = await response.json();
      console.log(`\nTotal enquiries: ${enquiries.length}`);
      
      // Show the most recent 3 enquiries
      const recent = enquiries.slice(-3);
      console.log('\nMost recent enquiries:');
      recent.forEach((enquiry, index) => {
        console.log(`\n${index + 1}. Enquiry #${enquiry.id}`);
        console.log(`   Title: ${enquiry.title}`);
        console.log(`   Client: ${enquiry.clientName}`);
        console.log(`   Email: ${enquiry.clientEmail}`);
        console.log(`   Status: ${enquiry.status}`);
        console.log(`   Source: ${enquiry.source || 'Unknown'}`);
        console.log(`   Created: ${enquiry.createdAt || 'N/A'}`);
      });
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

checkRecentEnquiries();