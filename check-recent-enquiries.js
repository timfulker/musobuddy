/**
 * Check for new enquiries created from email forwarding
 */

async function checkForNewEnquiries() {
  console.log('Checking for new enquiries...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    
    if (!response.ok) {
      console.error('Failed to fetch enquiries:', response.status, response.statusText);
      return;
    }
    
    const enquiries = await response.json();
    
    console.log('Total enquiries:', enquiries.length);
    console.log('\nLast 5 enquiries:');
    
    enquiries.slice(-5).forEach(enquiry => {
      console.log(`- ID: ${enquiry.id}`);
      console.log(`  Title: ${enquiry.title}`);
      console.log(`  Client: ${enquiry.clientName}`);
      console.log(`  Email: ${enquiry.clientEmail}`);
      console.log(`  Status: ${enquiry.status}`);
      console.log(`  Created: ${enquiry.createdAt}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error checking enquiries:', error);
  }
}

checkForNewEnquiries();