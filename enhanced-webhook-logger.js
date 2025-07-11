/**
 * Enhanced webhook logger to capture ALL incoming requests
 * This will help us see what real emails look like vs test data
 */

console.log('🔍 ENHANCED WEBHOOK MONITORING');
console.log('Send a real email to leads@musobuddy.com now...');
console.log('This will capture the exact format Mailgun sends');

// Monitor for the next 60 seconds
let monitoringActive = true;
let lastEnquiryCount = 0;

async function checkForNewActivity() {
  try {
    // Check if new enquiries were created
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: 'debug@musobuddy.com',
        sender: 'monitor@example.com',
        subject: '[MONITOR] Check Activity',
        'body-plain': 'Monitoring check - timestamp: ' + new Date().toISOString()
      })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.enquiryId && result.enquiryId > lastEnquiryCount) {
        console.log(`📧 New enquiry detected: #${result.enquiryId}`);
        lastEnquiryCount = result.enquiryId;
      }
    }
  } catch (error) {
    // Ignore monitoring errors
  }
}

console.log('\n🚨 SEND YOUR TEST EMAIL NOW');
console.log('Watching for webhook activity...');

// Monitor for 30 seconds
setTimeout(() => {
  monitoringActive = false;
  console.log('\n⏰ Monitoring complete');
  console.log('Check the Replit console logs for any error messages');
  console.log('Look for webhook POST requests and any parsing errors');
}, 30000);

// Check every 2 seconds
const interval = setInterval(() => {
  if (!monitoringActive) {
    clearInterval(interval);
    return;
  }
  checkForNewActivity();
}, 2000);