/**
 * Check for new enquiries created from email forwarding
 */

async function checkForNewEnquiries() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    
    if (response.ok) {
      const enquiries = await response.json();
      
      console.log('📧 Latest enquiries (last 5):');
      enquiries.slice(0, 5).forEach((enquiry, index) => {
        console.log(`\n📋 ${index + 1}. Enquiry #${enquiry.id}`);
        console.log(`   Client: ${enquiry.clientName}`);
        console.log(`   Email: ${enquiry.clientEmail}`);
        console.log(`   Subject: ${enquiry.title}`);
        console.log(`   Content: ${enquiry.notes ? enquiry.notes.substring(0, 100) + '...' : 'No message content'}`);
        console.log(`   Phone: ${enquiry.clientPhone || 'Not extracted'}`);
        console.log(`   Created: ${new Date(enquiry.createdAt).toLocaleString()}`);
        console.log(`   Source: ${enquiry.source || 'Email'}`);
      });
      
      // Check for recent enquiries that might be from the test
      const recentEnquiries = enquiries.filter(e => {
        const createdTime = new Date(e.createdAt).getTime();
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        return createdTime > fiveMinutesAgo;
      });
      
      console.log(`\n🔍 Recent enquiries (last 5 minutes): ${recentEnquiries.length}`);
      
      if (recentEnquiries.length > 0) {
        console.log('✅ Found recent enquiries - emails were processed');
        recentEnquiries.forEach(e => {
          console.log(`   - ${e.clientName} (${e.clientEmail}): ${e.notes ? 'HAS CONTENT' : 'NO CONTENT'}`);
        });
      } else {
        console.log('❌ No recent enquiries found - emails may not have reached webhook');
      }
      
    } else {
      console.log('❌ Failed to fetch enquiries:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkForNewEnquiries();