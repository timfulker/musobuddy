/**
 * Analyze webhook logs to understand what Mailgun actually sent
 */

console.log('🔍 WEBHOOK LOG ANALYSIS');
console.log('');
console.log('Looking at enquiry #292 (your email):');
console.log('❌ Client: unknown');
console.log('❌ Email: unknown@example.com');
console.log('❌ Content: No message content');
console.log('');
console.log('This pattern indicates:');
console.log('✅ Mailgun route is working (webhook was called)');
console.log('✅ Enhanced webhook handler is active');
console.log('❌ Mailgun sent email data in an unexpected field format');
console.log('');
console.log('🔍 Expected webhook inspection logs:');
console.log('In the console above, look for these specific log entries:');
console.log('');
console.log('🔍 === WEBHOOK DATA INSPECTION START ===');
console.log('📧 Raw body data: { ... }');
console.log('🔍 Field inspection results:');
console.log('   - sender: (found/not found)');
console.log('   - From: (found/not found)');
console.log('   - subject: (found/not found)');
console.log('   - body-plain: (found/not found)');
console.log('   - body-html: (found/not found)');
console.log('🔍 === WEBHOOK DATA INSPECTION END ===');
console.log('');
console.log('📧 CRITICAL: If you don\'t see these logs, it means:');
console.log('1. The webhook inspection system didn\'t trigger');
console.log('2. OR the email went to a different webhook handler');
console.log('3. OR Mailgun is using a completely different route');
console.log('');
console.log('🔧 Next steps:');
console.log('1. Check the console logs above for webhook inspection data');
console.log('2. If no inspection logs are visible, we need to verify Mailgun route configuration');
console.log('3. If inspection logs show empty/missing fields, we need to adapt the parser');
console.log('');
console.log('📋 Expected Mailgun route configuration:');
console.log('   Expression: catch_all()');
console.log('   Priority: 0');
console.log('   Action: forward("https://musobuddy.replit.app/api/webhook/mailgun")');