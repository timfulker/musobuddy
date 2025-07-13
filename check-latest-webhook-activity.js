/**
 * Check if the latest email to leads@mg.musobuddy.com was received
 */

async function checkWebhookActivity() {
  console.log('⏰ Checking for webhook activity from your latest email...');
  console.log('📧 Looking for enquiries created in the last 2 minutes...');
  
  // Check for very recent enquiries
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        sender: 'Console Check <console@test.com>',
        subject: 'Webhook Activity Check',
        'body-plain': 'Checking if webhook is still active and processing'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook is active and processing');
      console.log('📊 Latest test enquiry:', result.enquiryId);
      console.log('');
    }
  } catch (error) {
    console.log('❌ Webhook test failed:', error.message);
  }
  
  console.log('🔍 Expected webhook behavior for your email:');
  console.log('');
  console.log('In the Replit console above, you should see:');
  console.log('1. "🔍 === WEBHOOK DATA INSPECTION START ===" - Shows webhook received email');
  console.log('2. "🔍 COMPLETE BODY DATA:" - Shows all fields Mailgun sent');
  console.log('3. "🔍 MAILGUN FIELD INSPECTION:" - Shows which fields are populated');
  console.log('4. "🔍 EMAIL EXTRACTION TEST:" - Shows what got extracted');
  console.log('5. "📧 ✅ Enquiry created:" - Shows the new enquiry ID');
  console.log('');
  console.log('📧 Key things to look for:');
  console.log('- sender field: Should show your email address');
  console.log('- subject field: Should show your email subject');  
  console.log('- body-plain field: Should show your email content');
  console.log('- If any field shows "NOT_FOUND", that explains the parsing issue');
  console.log('');
  console.log('🎯 If you see the webhook inspection logs, copy the key details');
  console.log('   and I can fix the parsing logic to handle your email format properly.');
}

checkWebhookActivity();