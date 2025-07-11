/**
 * Check for new enquiries created from your test emails
 */

async function checkForNewEnquiries() {
  console.log('Checking for new enquiries from your test emails...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries', {
      headers: {
        'Cookie': 'connect.sid=s%3AyourSessionId' // This won't work externally but we can try
      }
    });
    
    if (response.ok) {
      const enquiries = await response.json();
      
      // Filter for enquiries created after #201
      const newEnquiries = enquiries.filter(e => e.id > 201);
      
      console.log(`Found ${newEnquiries.length} new enquiries after #201:`);
      
      newEnquiries.forEach(enquiry => {
        console.log(`\n📧 Enquiry #${enquiry.id}`);
        console.log(`   Title: ${enquiry.title}`);
        console.log(`   Client: ${enquiry.clientName}`);
        console.log(`   Email: ${enquiry.clientEmail}`);
        console.log(`   Status: ${enquiry.status}`);
        console.log(`   Created: ${enquiry.createdAt || 'N/A'}`);
      });
      
      if (newEnquiries.length === 0) {
        console.log('\n❌ No new enquiries found');
        console.log('This could mean:');
        console.log('1. Emails are still being processed (can take 1-2 minutes)');
        console.log('2. Mailgun route configuration needs verification');
        console.log('3. Emails went to spam/junk folders');
      } else {
        console.log(`\n✅ SUCCESS! Your emails are being processed correctly.`);
      }
      
    } else {
      console.log('❌ Could not fetch enquiries:', response.status);
      console.log('This is expected from external script - authentication required');
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
    console.log('This is expected from external script - authentication required');
  }
}

checkForNewEnquiries();