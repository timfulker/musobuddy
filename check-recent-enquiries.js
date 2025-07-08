// Check for enquiries created in the last 10 minutes
console.log('🔍 CHECKING FOR NEW ENQUIRIES FROM YOUR 4 EMAILS...');

fetch('https://musobuddy.replit.app/api/enquiries')
.then(response => response.json())
.then(data => {
  console.log('Raw response:', typeof data, data);
  
  const enquiries = Array.isArray(data) ? data : [data];
  const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
  
  // Sort by ID to see latest first
  const sortedEnquiries = enquiries.sort((a, b) => b.id - a.id);
  
  console.log('\nRecent enquiries (last 10):');
  sortedEnquiries.slice(0, 10).forEach(enquiry => {
    const createdTime = new Date(enquiry.createdAt || 0);
    const isRecent = createdTime.getTime() > tenMinutesAgo;
    
    console.log(`${isRecent ? '🔥 NEW' : '   OLD'} #${enquiry.id}: ${enquiry.title} (${enquiry.source}) - ${enquiry.clientName}`);
  });
  
  // Check for email source enquiries specifically
  const emailEnquiries = enquiries.filter(e => e.source === 'Email');
  console.log(`\n📧 Total email enquiries in system: ${emailEnquiries.length}`);
  
  const recentEmailEnquiries = emailEnquiries.filter(e => {
    const createdTime = new Date(e.createdAt || 0).getTime();
    return createdTime > tenMinutesAgo;
  });
  
  if (recentEmailEnquiries.length > 0) {
    console.log(`\n✅ Found ${recentEmailEnquiries.length} new email enquiries!`);
    recentEmailEnquiries.forEach(enquiry => {
      console.log(`   - ${enquiry.clientName} (${enquiry.clientEmail}): "${enquiry.title}"`);
    });
  } else {
    console.log('\n❌ No new email enquiries detected from your 4 test emails');
    console.log('This suggests the emails may not be reaching the webhook.');
  }
})
.catch(error => {
  console.error('Error checking enquiries:', error);
});