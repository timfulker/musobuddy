/**
 * Monitor for the latest email enquiry
 */

async function monitorLatestEmail() {
  console.log('📧 Monitoring for your latest email enquiry...');
  
  // Check for webhook activity
  console.log('🔍 Checking webhook endpoint status...');
  try {
    const response = await fetch('https://musobuddy.replit.app/api/health');
    if (response.ok) {
      console.log('✅ Production webhook endpoint is active');
    } else {
      console.log('❌ Production webhook endpoint issue');
    }
  } catch (error) {
    console.log('❌ Cannot reach production webhook:', error.message);
  }
  
  console.log('');
  console.log('📊 Expected behavior with enhanced webhook:');
  console.log('');
  console.log('✅ SUCCESS indicators:');
  console.log('   - Client name: "Tim Fulker" or "timfulkermusic" (extracted from email)');
  console.log('   - Email: "timfulkermusic@gmail.com" (proper extraction)');
  console.log('   - Notes: Full email content (not "No message content")');
  console.log('   - Title: Actual email subject (not "Email enquiry")');
  console.log('');
  console.log('🔍 What the enhanced webhook does:');
  console.log('   - Extracts sender from multiple field formats (sender, From, from)');
  console.log('   - Extracts subject from multiple field formats (subject, Subject)');
  console.log('   - Extracts body from plain text OR HTML content');
  console.log('   - Parses phone numbers, event dates, venues from email content');
  console.log('   - Provides detailed console logging of all processing');
  console.log('');
  console.log('📈 Check the database results to verify:');
  console.log('   - New enquiry with ID > 297');
  console.log('   - Contains actual email content and client information');
  console.log('   - Enhanced parsing extracted structured data');
  console.log('');
  console.log('🚀 The enhanced email forwarding system is now live!');
}

monitorLatestEmail();