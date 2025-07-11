/**
 * Debug Mailgun route configuration and webhook accessibility
 */

async function checkMailgunRoute() {
  console.log('🔍 DEBUGGING MAILGUN ROUTE CONFIGURATION');
  
  // Test if the webhook endpoint is accessible
  console.log('\n1. Testing webhook endpoint accessibility:');
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/Test'
      },
      body: 'recipient=leads@musobuddy.com&sender=test@example.com&subject=Route Test&body-plain=Testing route configuration'
    });
    
    console.log('✅ Webhook endpoint response:', response.status);
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook processed successfully:', result);
    } else {
      console.log('❌ Webhook failed:', await response.text());
    }
    
  } catch (error) {
    console.log('❌ Webhook endpoint not accessible:', error.message);
  }
  
  // Instructions for checking Mailgun route
  console.log('\n2. Mailgun Route Configuration Check:');
  console.log('Please verify in your Mailgun control panel:');
  console.log('• Domain: musobuddy.com');
  console.log('• Routes section');
  console.log('• Expression: catch_all()');
  console.log('• Action: forward("https://musobuddy.replit.app/api/webhook/mailgun")');
  console.log('• Priority: 0');
  console.log('• Status: Active');
  
  console.log('\n3. Common Issues to Check:');
  console.log('• Route URL must be EXACTLY: https://musobuddy.replit.app/api/webhook/mailgun');
  console.log('• No trailing slash');
  console.log('• HTTPS (not HTTP)');
  console.log('• Expression must be catch_all() not just catch_all');
  console.log('• Priority should be 0 (highest)');
  
  console.log('\n4. Expected Replit Console Logs:');
  console.log('If emails are reaching the webhook, you should see:');
  console.log('• "📧 MAILGUN WEBHOOK HIT! Email received..."');
  console.log('• "📧 Form field" entries showing the email data');
  console.log('• "🔍 DEBUG WEBHOOK - PROCESSING EMAIL"');
  
  console.log('\n5. Next Steps:');
  console.log('• Check Mailgun logs for delivery attempts');
  console.log('• Verify route is active and not paused');
  console.log('• Send another test email to leads@musobuddy.com');
  console.log('• Watch Replit console for webhook hits');
}

checkMailgunRoute();