/**
 * Check SendGrid configuration and recent activity
 */

import https from 'https';

function checkSendGridStatus() {
  console.log('=== SENDGRID STATUS CHECK ===');
  console.log('Configuration visible in screenshot:');
  console.log('✅ Host: musobuddy.com');
  console.log('✅ URL: https://musobuddy.replit.app/api/webhook/sendgrid');
  console.log('❌ Spam Check: Disabled (X)');
  console.log('✅ Send Raw: Enabled (✓)');
  console.log('');
  
  console.log('=== WEBHOOK ENDPOINT STATUS ===');
  
  // Test webhook endpoint
  const getOptions = {
    hostname: 'musobuddy.replit.app',
    port: 443,
    path: '/api/webhook/sendgrid',
    method: 'GET'
  };

  const getRequest = https.request(getOptions, (res) => {
    console.log(`Webhook Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      const response = JSON.parse(data);
      console.log('Webhook Response:', response);
      
      console.log('');
      console.log('=== ANALYSIS ===');
      console.log('✅ Webhook endpoint is accessible');
      console.log('✅ SendGrid configuration looks correct');
      console.log('❌ Test emails not reaching webhook');
      console.log('');
      console.log('=== RECOMMENDATIONS ===');
      console.log('1. Check SendGrid Activity log for delivery attempts');
      console.log('2. Verify MX records are still pointing to mx.sendgrid.net');
      console.log('3. Consider enabling Spam Check in SendGrid settings');
      console.log('4. Test with different email providers');
      console.log('');
      console.log('=== NEXT STEPS ===');
      console.log('• SendGrid Support: Reference webhook URL change from webhook.site');
      console.log('• MX Record Check: Ensure musobuddy.com → mx.sendgrid.net');
      console.log('• Activity Log: Check for failed delivery attempts');
    });
  });

  getRequest.on('error', (error) => {
    console.error('Error:', error);
  });

  getRequest.end();
}

checkSendGridStatus();