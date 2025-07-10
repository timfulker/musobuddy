/**
 * Monitor webhook activity in real-time
 */

console.log('=== MONITORING WEBHOOK ACTIVITY ===');
console.log('Current webhook URL: https://musobuddy.replit.app/api/webhook/sendgrid');
console.log('');
console.log('INSTRUCTIONS:');
console.log('1. Keep this script running');
console.log('2. Send a test email to leads@musobuddy.com');
console.log('3. Watch for webhook activity in the logs');
console.log('');
console.log('If you see "🔥 WEBHOOK HIT!" in the logs, the webhook is working');
console.log('If you see no activity, SendGrid is not routing emails to your webhook');
console.log('');
console.log('ALTERNATIVE TEST:');
console.log('1. Temporarily change SendGrid webhook URL to: https://musobuddy.replit.app/api/webhook/debug');
console.log('2. Send test email');
console.log('3. Check if debug endpoint logs any activity');
console.log('4. Change back to: https://musobuddy.replit.app/api/webhook/sendgrid');
console.log('');
console.log('Monitoring webhook activity... (send your test email now)');

// Keep the script running
setInterval(() => {
  process.stdout.write('.');
}, 5000);