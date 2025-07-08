/**
 * Email Delivery Diagnostic Tool
 * Tests all components of the email forwarding system
 */

console.log('=== MUSOBUDDY EMAIL DELIVERY DIAGNOSTIC ===\n');

// Test 1: DNS Configuration
async function testDNS() {
  console.log('1. DNS CONFIGURATION TEST');
  console.log('----------------------------');
  
  try {
    const mxResponse = await fetch('https://dns.google/resolve?name=musobuddy.com&type=MX');
    const mxData = await mxResponse.json();
    
    if (mxData.Answer && mxData.Answer.length > 0) {
      console.log('✅ MX Record Found:', mxData.Answer[0].data);
      
      if (mxData.Answer[0].data.includes('sendgrid.net')) {
        console.log('✅ MX Points to SendGrid');
      } else {
        console.log('❌ MX Does NOT point to SendGrid');
      }
    } else {
      console.log('❌ No MX Record Found');
    }
    
    // Test A record
    const aResponse = await fetch('https://dns.google/resolve?name=musobuddy.com&type=A');
    const aData = await aResponse.json();
    
    if (aData.Answer && aData.Answer.length > 0) {
      console.log('✅ A Record Found:', aData.Answer[0].data);
    } else {
      console.log('❌ No A Record Found');
    }
    
  } catch (error) {
    console.log('❌ DNS Test Failed:', error.message);
  }
  
  console.log('');
}

// Test 2: Webhook Endpoint
async function testWebhook() {
  console.log('2. WEBHOOK ENDPOINT TEST');
  console.log('----------------------------');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/webhook/sendgrid', {
      method: 'GET'
    });
    
    console.log('Status Code:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (response.status === 200) {
      const data = await response.text();
      
      if (data.includes('<!DOCTYPE html>')) {
        console.log('❌ CRITICAL: Webhook returns HTML instead of JSON');
        console.log('   This means SendGrid gets 200 OK but email is lost');
      } else {
        console.log('✅ Webhook returns proper response');
      }
    } else {
      console.log('❌ Webhook not accessible');
    }
    
  } catch (error) {
    console.log('❌ Webhook Test Failed:', error.message);
  }
  
  console.log('');
}

// Test 3: Email Chain Analysis
async function analyzeEmailChain() {
  console.log('3. EMAIL DELIVERY CHAIN ANALYSIS');
  console.log('-----------------------------------');
  
  console.log('Expected Flow:');
  console.log('  Email → Gmail/Yahoo/Outlook');
  console.log('  ↓');
  console.log('  DNS Lookup for musobuddy.com MX record');
  console.log('  ↓');
  console.log('  Email sent to mx.sendgrid.net');
  console.log('  ↓');
  console.log('  SendGrid receives email');
  console.log('  ↓');
  console.log('  SendGrid processes via Inbound Parse');
  console.log('  ↓');
  console.log('  SendGrid POSTs to webhook');
  console.log('  ↓');
  console.log('  Webhook creates enquiry');
  console.log('');
  
  console.log('POTENTIAL FAILURE POINTS:');
  console.log('❓ SendGrid not configured for musobuddy.com');
  console.log('❓ Inbound Parse not enabled for domain');
  console.log('❓ Webhook URL incorrect in SendGrid');
  console.log('❓ DNS propagation incomplete');
  console.log('❓ Email provider blocking/filtering');
  console.log('');
}

// Test 4: Common Issues
async function diagnoseCommonIssues() {
  console.log('4. COMMON EMAIL FORWARDING ISSUES');
  console.log('-----------------------------------');
  
  console.log('🔍 ISSUE 1: SendGrid Domain Not Verified');
  console.log('   - SendGrid only accepts emails for verified domains');
  console.log('   - Check SendGrid dashboard for domain verification');
  console.log('');
  
  console.log('🔍 ISSUE 2: Inbound Parse Not Configured');
  console.log('   - MX record points to SendGrid but Parse not enabled');
  console.log('   - Need to configure hostname and webhook URL');
  console.log('');
  
  console.log('🔍 ISSUE 3: Webhook URL Mismatch');
  console.log('   - SendGrid configured with wrong webhook URL');
  console.log('   - Current webhook: https://musobuddy.replit.app/webhook/sendgrid');
  console.log('');
  
  console.log('🔍 ISSUE 4: DNS Propagation');
  console.log('   - MX changes can take 24-48 hours to propagate');
  console.log('   - Different DNS servers may have different values');
  console.log('');
}

// Run all tests
async function runAllTests() {
  await testDNS();
  await testWebhook();
  await analyzeEmailChain();
  await diagnoseCommonIssues();
  
  console.log('=== NEXT STEPS ===');
  console.log('1. Check SendGrid dashboard for domain verification');
  console.log('2. Verify Inbound Parse is enabled for musobuddy.com');
  console.log('3. Test email delivery from different providers');
  console.log('4. Check SendGrid activity logs for incoming emails');
}

runAllTests().catch(console.error);