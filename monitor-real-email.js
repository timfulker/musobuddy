/**
 * Monitor for new enquiries from your test emails
 */

async function checkForNewEnquiries() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    
    if (response.ok) {
      const enquiries = await response.json();
      console.log('📋 Total enquiries:', enquiries.length);
      
      // Filter for recent enquiries from timfulkermusic@gmail.com
      const recentEnquiries = enquiries.filter(e => 
        e.clientEmail === 'timfulkermusic@gmail.com' || 
        e.clientName.includes('timfulkermusic')
      ).slice(0, 5);
      
      console.log('\n📧 Recent enquiries from timfulkermusic@gmail.com:');
      recentEnquiries.forEach(enquiry => {
        console.log(`\n📋 ID: ${enquiry.id} | Created: ${new Date(enquiry.createdAt).toLocaleString()}`);
        console.log(`   Client: ${enquiry.clientName}`);
        console.log(`   Email: ${enquiry.clientEmail}`);
        console.log(`   Subject: ${enquiry.title}`);
        console.log(`   Content: ${enquiry.notes || 'No message content'}`);
        console.log(`   Phone: ${enquiry.clientPhone || 'Not extracted'}`);
        console.log(`   Event Date: ${enquiry.eventDate || 'Not extracted'}`);
        console.log(`   Venue: ${enquiry.venue || 'Not extracted'}`);
        console.log(`   Event Type: ${enquiry.eventType || 'Not extracted'}`);
        console.log(`   Gig Type: ${enquiry.gigType || 'Not extracted'}`);
        console.log('   ---');
      });
      
      if (recentEnquiries.length === 0) {
        console.log('❌ No recent enquiries found from timfulkermusic@gmail.com');
        console.log('   This suggests the webhook may not be receiving real emails');
      }
      
    } else {
      console.log('❌ Failed to fetch enquiries:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkForNewEnquiries();