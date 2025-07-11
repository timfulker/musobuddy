/**
 * Check for new enquiries created from email forwarding
 */

async function checkForNewEnquiries() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    if (response.ok) {
      const enquiries = await response.json();
      console.log(`Total enquiries: ${enquiries.length}`);
      
      // Show the last 5 enquiries to understand the pattern
      const recent = enquiries.slice(-5);
      console.log('\nMost recent 5 enquiries:');
      recent.forEach((enquiry, index) => {
        console.log(`\n${index + 1}. Enquiry #${enquiry.id}`);
        console.log(`   Title: ${enquiry.title}`);
        console.log(`   Client: ${enquiry.clientName}`);
        console.log(`   Email: ${enquiry.clientEmail}`);
        console.log(`   Status: ${enquiry.status}`);
        console.log(`   Source: ${enquiry.source || 'Unknown'}`);
        console.log(`   Event Date: ${enquiry.eventDate || 'N/A'}`);
        console.log(`   Created: ${enquiry.createdAt || 'N/A'}`);
        console.log(`   Notes: ${enquiry.notes?.substring(0, 100) || 'N/A'}...`);
      });
      
      // Look for patterns in recent enquiries
      const emailEnquiries = enquiries.filter(e => e.source === 'email' || e.title.includes('email') || e.title.includes('Email'));
      console.log(`\nEmail-based enquiries: ${emailEnquiries.length}`);
      
      if (emailEnquiries.length > 0) {
        console.log('\nMost recent email enquiry:');
        const lastEmail = emailEnquiries[emailEnquiries.length - 1];
        console.log(`ID: ${lastEmail.id}`);
        console.log(`Title: ${lastEmail.title}`);
        console.log(`Client: ${lastEmail.clientName}`);
        console.log(`Email: ${lastEmail.clientEmail}`);
        console.log(`Notes: ${lastEmail.notes}`);
      }
      
    } else {
      console.log('Failed to fetch enquiries');
    }
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

checkForNewEnquiries();