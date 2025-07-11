/**
 * Check if your test emails created new enquiries
 */

async function checkEmailTest() {
  try {
    console.log('Checking for new enquiries from your test emails...');
    
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    const data = await response.json();
    
    if (Array.isArray(data)) {
      console.log(`\nTotal enquiries: ${data.length}`);
      
      // Show the last 5 enquiries
      const recent = data.slice(-5);
      console.log('\nMost recent 5 enquiries:');
      recent.forEach((enquiry, index) => {
        console.log(`\n${index + 1}. Enquiry #${enquiry.id}`);
        console.log(`   Title: ${enquiry.title}`);
        console.log(`   Client: ${enquiry.clientName}`);
        console.log(`   Email: ${enquiry.clientEmail}`);
        console.log(`   Created: ${new Date(enquiry.createdAt || Date.now()).toLocaleString()}`);
        console.log(`   Source: ${enquiry.source || 'Unknown'}`);
      });
      
      // Check for very recent enquiries (last 5 minutes)
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const recentEnquiries = data.filter(enquiry => {
        const created = new Date(enquiry.createdAt || 0);
        return created > fiveMinutesAgo;
      });
      
      if (recentEnquiries.length > 0) {
        console.log(`\n🎉 ${recentEnquiries.length} enquiries created in the last 5 minutes!`);
        console.log('✅ Your email forwarding is working!');
      } else {
        console.log('\n⏳ No new enquiries in the last 5 minutes');
        console.log('📧 Your emails might still be processing or there may be a delay');
      }
      
    } else {
      console.log('Unexpected response format:', data);
    }
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
}

checkEmailTest();