/**
 * Check for new enquiries created from email forwarding
 */

async function checkForNewEnquiries() {
  console.log('=== Checking for Recent Enquiries ===');
  console.log('Time:', new Date().toISOString());
  
  try {
    const response = await fetch('https://musobuddy.com/api/enquiries', {
      headers: {
        'Cookie': 'connect.sid=s%3AreEUKsCAAhNQWBnwTUkLhKJFzKNTfpB7.8aUVUXBIKvzSNAFbAQNKfKhTH1bCEWOiDEJCHUPLWNQ'
      }
    });
    
    if (!response.ok) {
      console.log('❌ Failed to fetch enquiries:', response.status, response.statusText);
      return;
    }
    
    const enquiries = await response.json();
    console.log(`📋 Total enquiries found: ${enquiries.length}`);
    
    // Sort by creation date (newest first)
    enquiries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Show recent enquiries (last 10)
    console.log('\n🔍 Recent enquiries:');
    enquiries.slice(0, 10).forEach((enquiry, index) => {
      const createdAt = new Date(enquiry.createdAt);
      const timeAgo = Math.round((Date.now() - createdAt.getTime()) / (1000 * 60)); // minutes ago
      
      console.log(`${index + 1}. ID: ${enquiry.id}`);
      console.log(`   Title: ${enquiry.title}`);
      console.log(`   Client: ${enquiry.clientName} (${enquiry.clientEmail || 'no email'})`);
      console.log(`   Created: ${createdAt.toLocaleString()} (${timeAgo} mins ago)`);
      console.log(`   Notes: ${enquiry.notes?.substring(0, 100)}...`);
      console.log('   ---');
    });
    
    // Check for enquiries created in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentEnquiries = enquiries.filter(e => new Date(e.createdAt) > oneHourAgo);
    
    console.log(`\n⏰ Enquiries created in the last hour: ${recentEnquiries.length}`);
    
    if (recentEnquiries.length > 0) {
      console.log('🎉 Recent enquiries found:');
      recentEnquiries.forEach(enquiry => {
        console.log(`✅ ID ${enquiry.id}: ${enquiry.title} from ${enquiry.clientName}`);
      });
    } else {
      console.log('⏳ No new enquiries in the last hour');
    }
    
  } catch (error) {
    console.log('❌ Error checking enquiries:', error.message);
  }
}

// Run the check
checkForNewEnquiries().catch(console.error);