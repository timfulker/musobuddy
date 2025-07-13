/**
 * Check recent webhook activity and enquiry creation
 */

async function checkRecentActivity() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    
    if (response.ok) {
      const enquiries = await response.json();
      
      console.log('📧 Recent enquiries from timfulkermusic@gmail.com:');
      
      const timEnquiries = enquiries.filter(e => 
        e.clientEmail === 'timfulkermusic@gmail.com' || 
        e.clientName === 'timfulkermusic@gmail.com'
      );
      
      timEnquiries.slice(0, 3).forEach(enquiry => {
        console.log(`\n📋 Enquiry #${enquiry.id}:`);
        console.log(`  Client: ${enquiry.clientName}`);
        console.log(`  Email: ${enquiry.clientEmail}`);
        console.log(`  Title: ${enquiry.title}`);
        console.log(`  Notes: ${enquiry.notes || 'No message content'}`);
        console.log(`  Source: ${enquiry.source || 'Email'}`);
        console.log(`  Created: ${new Date(enquiry.createdAt).toLocaleString()}`);
      });
      
      if (timEnquiries.length === 0) {
        console.log('❌ No enquiries found from timfulkermusic@gmail.com');
      }
      
    } else {
      console.log('❌ Failed to fetch enquiries:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRecentActivity();