/**
 * Monitor webhook for recent activity
 */

async function checkForNewEnquiries() {
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries', {
      headers: {
        'Cookie': 'connect.sid=s%3A9lhgXLFfKsKYMxPqRLgKFjfHJhbXoIHT.xjMH5lQyHLWUNLhFqeqeLgE7HkWFfFmGAHgJRvfDFvU'
      }
    });
    
    if (response.ok) {
      const enquiries = await response.json();
      console.log('📋 Total enquiries:', enquiries.length);
      
      // Show the 3 most recent enquiries
      const recent = enquiries.slice(0, 3);
      console.log('\n🔍 Recent enquiries:');
      recent.forEach(enquiry => {
        console.log(`  ID: ${enquiry.id} | Client: ${enquiry.clientName} | Email: ${enquiry.clientEmail} | Status: ${enquiry.status}`);
        console.log(`  Title: ${enquiry.title}`);
        console.log(`  Notes: ${enquiry.notes ? enquiry.notes.substring(0, 100) + '...' : 'No notes'}`);
        console.log('  ---');
      });
    } else {
      console.log('❌ Failed to fetch enquiries:', response.status);
    }
  } catch (error) {
    console.error('❌ Error fetching enquiries:', error.message);
  }
}

async function startMonitoring() {
  console.log('📧 Monitoring for new enquiries from timfulkermusic@gmail.com...');
  console.log('⏰ Checking every 10 seconds for 2 minutes...');
  
  let checks = 0;
  const maxChecks = 12; // 2 minutes
  
  const interval = setInterval(async () => {
    checks++;
    console.log(`\n🔍 Check ${checks}/${maxChecks} - ${new Date().toLocaleTimeString()}`);
    
    await checkForNewEnquiries();
    
    if (checks >= maxChecks) {
      clearInterval(interval);
      console.log('\n⏰ Monitoring complete. If no new enquiry appeared, check Mailgun route configuration.');
    }
  }, 10000);
  
  // Initial check
  await checkForNewEnquiries();
}

startMonitoring();