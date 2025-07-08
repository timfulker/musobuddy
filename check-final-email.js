// Simple check for new enquiries
async function checkForNewEnquiries() {
  console.log('Checking for new enquiries...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    const data = await response.text();
    
    console.log('Raw API response:', data.substring(0, 200) + '...');
    
    // Try to parse as JSON
    const enquiries = JSON.parse(data);
    
    if (Array.isArray(enquiries)) {
      const sorted = enquiries.sort((a, b) => b.id - a.id);
      console.log(`Found ${enquiries.length} enquiries`);
      console.log('Latest enquiry:', sorted[0]);
      
      if (sorted[0] && sorted[0].id > 28) {
        console.log('🎉 NEW ENQUIRY FOUND!');
        console.log(`ID: ${sorted[0].id}`);
        console.log(`Title: ${sorted[0].title}`);
        console.log(`Created: ${sorted[0].created_at}`);
      } else {
        console.log('No new enquiries since #28');
      }
    } else {
      console.log('Unexpected response format:', enquiries);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkForNewEnquiries();