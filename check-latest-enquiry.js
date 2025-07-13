/**
 * Check if your latest email created a new enquiry
 */

async function checkLatestEnquiry() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    
    if (response.ok) {
      const enquiries = await response.json();
      const latest = enquiries[0];
      
      console.log('📧 Latest enquiry:');
      console.log(`  ID: ${latest.id}`);
      console.log(`  Client: ${latest.clientName}`);
      console.log(`  Email: ${latest.clientEmail}`);
      console.log(`  Title: ${latest.title}`);
      console.log(`  Created: ${new Date(latest.createdAt).toLocaleString()}`);
      console.log(`  Status: ${latest.status}`);
      
      // Check if it's from timfulkermusic@gmail.com
      if (latest.clientEmail === 'timfulkermusic@gmail.com') {
        console.log('\n✅ SUCCESS: Email from timfulkermusic@gmail.com was processed!');
      } else {
        console.log('\n❌ Latest enquiry is not from timfulkermusic@gmail.com');
        console.log('   This means the email may not have reached the webhook yet');
      }
      
    } else {
      console.log('❌ Failed to fetch enquiries:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkLatestEnquiry();