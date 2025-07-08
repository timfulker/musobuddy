/**
 * Email Delivery Diagnostic Tool
 * Tests all components of the email forwarding system
 */

const https = require('https');
const http = require('http');

// Test 1: DNS Resolution
console.log('=== DNS RESOLUTION TESTS ===');

async function testDNS() {
  try {
    const response = await fetch('https://dns.google/resolve?name=musobuddy.com&type=MX');
    const data = await response.json();
    console.log('Google DNS MX lookup:', data);
    
    const cloudflareResponse = await fetch('https://1.1.1.1/dns-query?name=musobuddy.com&type=MX', {
      headers: { 'Accept': 'application/dns-json' }
    });
    const cloudflareData = await cloudflareResponse.json();
    console.log('Cloudflare DNS MX lookup:', cloudflareData);
    
  } catch (error) {
    console.error('DNS test failed:', error);
  }
}

// Test 2: Webhook Endpoint
async function testWebhook() {
  console.log('\n=== WEBHOOK ENDPOINT TEST ===');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: 'leads@musobuddy.com',
        from: 'test@example.com',
        subject: 'Test Email Delivery',
        text: 'This is a test email to verify the webhook endpoint is working.'
      })
    });
    
    const result = await response.text();
    console.log('Webhook response status:', response.status);
    console.log('Webhook response:', result);
    
  } catch (error) {
    console.error('Webhook test failed:', error);
  }
}

// Test 3: Email Delivery Chain Analysis
async function analyzeEmailChain() {
  console.log('\n=== EMAIL DELIVERY CHAIN ANALYSIS ===');
  
  const tests = [
    { name: 'MX Record', test: 'musobuddy.com MX record points to mx.sendgrid.net' },
    { name: 'SendGrid Inbound Parse', test: 'Configured in SendGrid dashboard' },
    { name: 'Webhook Endpoint', test: 'https://musobuddy.replit.app/api/webhook/sendgrid' },
    { name: 'Authentication', test: 'Webhook bypasses auth middleware' },
    { name: 'Database', test: 'Storage.createEnquiry function' }
  ];
  
  tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}: ${test.test}`);
  });
}

// Test 4: Common DNS Issues
async function diagnoseCommonIssues() {
  console.log('\n=== COMMON DNS ISSUES DIAGNOSIS ===');
  
  const issues = [
    '❌ DNS Caching: Different email providers cache DNS records for different periods',
    '❌ TTL Issues: Short TTL values can cause inconsistent lookups',
    '❌ DNS Propagation: Global DNS propagation can take up to 48 hours',
    '❌ Email Provider Restrictions: Some providers have stricter DNS validation',
    '❌ SendGrid Processing: New domain authentication can take 15-30 minutes to activate'
  ];
  
  issues.forEach(issue => console.log(issue));
  
  console.log('\n=== TROUBLESHOOTING STEPS ===');
  console.log('1. Check SendGrid Activity page for email delivery attempts');
  console.log('2. Verify both inbound parse entries are active');
  console.log('3. Test with different email providers (Gmail, Yahoo, Outlook)');
  console.log('4. Wait 30 minutes for DNS propagation');
  console.log('5. Check for any SendGrid account limitations');
}

// Run all tests
async function runAllTests() {
  await testDNS();
  await testWebhook();
  await analyzeEmailChain();
  await diagnoseCommonIssues();
}

runAllTests();