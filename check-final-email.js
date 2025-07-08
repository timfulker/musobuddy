/**
 * Check for new enquiries created from Tim's test emails
 */

async function checkForNewEnquiries() {
  console.log('=== Checking for Email-Generated Enquiries ===');
  console.log('Looking for emails from:');
  console.log('- timfulkermusic@gmail.com');
  console.log('- tim@saxweddings.com');
  console.log('Time:', new Date().toISOString());
  
  try {
    // Get authentication session
    const authResponse = await fetch('https://musobuddy.com/api/auth/user');
    if (!authResponse.ok) {
      console.log('❌ Authentication failed');
      return;
    }
    
    const user = await authResponse.json();
    console.log('✅ Authenticated as:', user.email);
    
    // Fetch enquiries
    const enquiriesResponse = await fetch('https://musobuddy.com/api/enquiries');
    if (!enquiriesResponse.ok) {
      console.log('❌ Failed to fetch enquiries');
      return;
    }
    
    const enquiries = await enquiriesResponse.json();
    console.log(`📋 Total enquiries: ${enquiries.length}`);
    
    // Sort by creation date (newest first)
    enquiries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Look for enquiries from Tim's emails
    const timEmails = ['timfulkermusic@gmail.com', 'tim@saxweddings.com'];
    const timEnquiries = enquiries.filter(e => 
      timEmails.some(email => 
        e.clientEmail === email || 
        e.notes?.includes(email) ||
        e.title?.includes('Tim') ||
        e.clientName?.includes('Tim')
      )
    );
    
    console.log(`\n🔍 Enquiries potentially from Tim's emails: ${timEnquiries.length}`);
    
    if (timEnquiries.length > 0) {
      console.log('📧 Found enquiries from Tim:');
      timEnquiries.forEach((enquiry, index) => {
        console.log(`${index + 1}. ID: ${enquiry.id}`);
        console.log(`   Title: ${enquiry.title}`);
        console.log(`   Client: ${enquiry.clientName}`);
        console.log(`   Email: ${enquiry.clientEmail || 'none'}`);
        console.log(`   Created: ${new Date(enquiry.createdAt).toLocaleString()}`);
        console.log(`   Notes: ${enquiry.notes?.substring(0, 200)}...`);
        console.log('   ---');
      });
    }
    
    // Check for very recent enquiries (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const veryRecentEnquiries = enquiries.filter(e => new Date(e.createdAt) > twoHoursAgo);
    
    console.log(`\n⏰ Enquiries created in last 2 hours: ${veryRecentEnquiries.length}`);
    
    if (veryRecentEnquiries.length > 0) {
      console.log('🆕 Very recent enquiries:');
      veryRecentEnquiries.forEach(enquiry => {
        const timeAgo = Math.round((Date.now() - new Date(enquiry.createdAt).getTime()) / (1000 * 60));
        console.log(`✅ ID ${enquiry.id}: "${enquiry.title}" from ${enquiry.clientName} (${timeAgo} mins ago)`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the check
checkForNewEnquiries();