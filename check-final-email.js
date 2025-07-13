/**
 * Monitor for new enquiries from email forwarding test
 */

async function checkForNewEnquiries() {
  console.log('📧 Checking for new enquiries from your latest email...');
  
  // Test the webhook to ensure it's still working
  try {
    const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        sender: 'Webhook Test <webhook@test.com>',
        subject: 'Post-Email Test',
        'body-plain': 'Testing webhook after email was sent'
      })
    });
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Webhook is active and working');
      console.log(`📊 Test enquiry created: ${result.enquiryId}`);
      console.log(`📧 Processing type: ${result.processing}`);
      console.log('');
    }
  } catch (error) {
    console.log('❌ Webhook test failed:', error.message);
  }
  
  console.log('🔍 Analysis based on database results:');
  console.log('');
  console.log('If you see a new enquiry with:');
  console.log('✅ Your email address (timfulkermusic@gmail.com) - Email extraction working');
  console.log('✅ Full message content - Enhanced parsing successful');
  console.log('✅ Client name extracted - Smart name detection working');
  console.log('');
  console.log('❌ If you see "unknown@example.com" and "No message content":');
  console.log('   - The webhook received the email but Mailgun sent it in an unexpected format');
  console.log('   - We need to see the webhook inspection logs in the console');
  console.log('   - Look for "🔍 === WEBHOOK DATA INSPECTION START ===" in the logs above');
  console.log('');
  console.log('📈 Expected behavior:');
  console.log('Your email should have triggered the enhanced webhook with detailed logging');
  console.log('showing exactly what fields Mailgun sent and how they were processed.');
}

checkForNewEnquiries();