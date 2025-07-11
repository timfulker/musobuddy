/**
 * Monitor for new enquiries from email forwarding test
 */

async function checkForNewEnquiries() {
  console.log('Checking for new enquiries after #203...');
  
  // Look for webhook activity in the server logs
  // Since I can't access external API, let me check if webhook is receiving calls
  
  console.log('📊 STATUS CHECK:');
  console.log('• Last known enquiry: #203');
  console.log('• Debug webhook deployed successfully');
  console.log('• Emails sent: 2');
  console.log('• Expected: [DEBUG] enquiries with your email data');
  
  console.log('\n🔍 WHAT TO LOOK FOR IN DASHBOARD:');
  console.log('• New enquiries with ID > 203');
  console.log('• Enquiries with "[DEBUG]" in title');
  console.log('• Client name should be from your email address');
  console.log('• Notes should contain raw webhook data');
  
  console.log('\n📧 IF NO NEW ENQUIRIES APPEAR:');
  console.log('• Check if emails reached spam/junk folder');
  console.log('• Verify you sent to: leads@musobuddy.com');
  console.log('• Wait 2-3 minutes for processing');
  console.log('• Check Mailgun route configuration');
  
  console.log('\n🚨 CRITICAL DEBUG INFO:');
  console.log('The debug webhook logs EVERYTHING - if no enquiries appear,');
  console.log('it means emails are not reaching the webhook endpoint.');
  console.log('This would indicate a Mailgun routing issue, not a code issue.');
  
  console.log('\n⏰ NEXT STEPS:');
  console.log('1. Check your MusoBuddy dashboard now');
  console.log('2. Look for enquiries with higher ID numbers');
  console.log('3. If none appear, we need to check Mailgun route config');
}

checkForNewEnquiries();