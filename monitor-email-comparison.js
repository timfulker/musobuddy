/**
 * Monitor for emails from both working and problematic addresses
 */

async function monitorEmailComparison() {
  console.log('📧 Monitoring for email comparison test...');
  console.log('⏰ Send your test emails now and watch the console logs');
  console.log('');
  console.log('🔍 What to look for in the console:');
  console.log('1. "WEBHOOK DATA INSPECTION START" - confirms webhook received email');
  console.log('2. "COMPLETE BODY DATA" - shows exact data Mailgun sends');
  console.log('3. "MAILGUN FIELD INSPECTION" - shows which fields are populated');
  console.log('4. "EMAIL EXTRACTION TEST" - shows what gets extracted');
  console.log('');
  console.log('📝 Send emails in this order:');
  console.log('1. First: Send from working email address (timfulker@gmail.com)');
  console.log('2. Wait 30 seconds');
  console.log('3. Second: Send from problematic email (timfulkermusic@gmail.com)');
  console.log('');
  console.log('💡 The console logs will show the exact difference!');
  console.log('');
  console.log('⚠️  Important: Check the Replit console output above, not this script');
  console.log('   The webhook logs will appear in the main console window');
  
  // Keep the script running for monitoring
  let count = 0;
  const interval = setInterval(() => {
    count++;
    if (count <= 30) {
      console.log(`⏰ Monitoring... ${count}/30 (${count * 10} seconds)`);
    } else {
      console.log('⏰ Monitoring complete. Check the webhook logs in the main console.');
      clearInterval(interval);
    }
  }, 10000);
}

monitorEmailComparison();