/**
 * Check the latest enquiries to see if real emails are being processed
 */

async function checkLatestEnquiries() {
  console.log('📧 CHECKING LATEST ENQUIRIES');
  console.log('============================');
  
  try {
    // Get all enquiries to see the latest ones
    const response = await fetch('https://musobuddy.replit.app/api/enquiries', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AyFOIzIhqCCVKCqWKgEFZGzBxHNRqyZLZ.eMPpGkgqvEcUDCZ3bVQdJvHKLcmWoaOHlKCjKMVZKTQ' // Use your actual session cookie
      }
    });
    
    if (response.ok) {
      const enquiries = await response.json();
      
      console.log(`📊 Total enquiries: ${enquiries.length}`);
      console.log('\n🔍 Latest 10 enquiries:');
      console.log('─'.repeat(50));
      
      enquiries.slice(0, 10).forEach((enquiry, index) => {
        console.log(`${index + 1}. ID: ${enquiry.id} | Client: ${enquiry.clientName} | Email: ${enquiry.clientEmail}`);
        console.log(`   Title: ${enquiry.title}`);
        console.log(`   Created: ${new Date(enquiry.id * 1000).toLocaleString()}`);
        console.log(`   Notes: ${enquiry.notes?.substring(0, 100)}...`);
        console.log('');
      });
      
      // Check for any enquiries created in the last hour
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      const recentEnquiries = enquiries.filter(e => e.id * 1000 > oneHourAgo);
      
      console.log(`🕐 Enquiries created in the last hour: ${recentEnquiries.length}`);
      recentEnquiries.forEach((enquiry, index) => {
        console.log(`${index + 1}. ID: ${enquiry.id} | Client: ${enquiry.clientName} | ${enquiry.clientEmail}`);
      });
      
    } else {
      console.log('❌ Failed to fetch enquiries');
      console.log('Status:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.error('❌ REQUEST FAILED:', error.message);
  }
}

checkLatestEnquiries();