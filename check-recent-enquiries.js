/**
 * Check for new enquiries created from email forwarding
 */

async function checkForNewEnquiries() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    
    if (response.ok) {
      const enquiries = await response.json();
      console.log(`📋 Total enquiries: ${enquiries.length}`);
      
      // Show the last 5 enquiries
      console.log('\n🔍 Most recent enquiries:');
      const recent = enquiries.slice(-5);
      recent.forEach((enquiry, index) => {
        const created = new Date(enquiry.createdAt);
        console.log(`${index + 1}. #${enquiry.id} - ${enquiry.clientName} - ${enquiry.title}`);
        console.log(`   Created: ${created.toLocaleString()}`);
        console.log(`   Status: ${enquiry.status}`);
        if (enquiry.notes) {
          console.log(`   Notes: ${enquiry.notes.substring(0, 100)}...`);
        }
        console.log('');
      });
      
      // Check for very recent enquiries (last 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const veryRecent = enquiries.filter(enquiry => 
        new Date(enquiry.createdAt) > tenMinutesAgo
      );
      
      if (veryRecent.length > 0) {
        console.log('🎉 RECENT ENQUIRIES FOUND (last 10 minutes):');
        veryRecent.forEach(enquiry => {
          console.log(`• #${enquiry.id}: ${enquiry.clientName} - ${enquiry.title}`);
          console.log(`  Created: ${new Date(enquiry.createdAt).toLocaleString()}`);
        });
      } else {
        console.log('❌ No enquiries created in the last 10 minutes');
        console.log('This suggests the email may not have reached the webhook');
      }
      
    } else {
      console.log('❌ Failed to fetch enquiries:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkForNewEnquiries();