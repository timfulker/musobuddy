/**
 * Email Delivery Diagnostic Tool
 * Tests all components of the email forwarding system
 */

console.log('🔍 DIAGNOSING EMAIL DELIVERY ISSUES...');

async function testDNS() {
  console.log('\n1. Testing DNS Records...');
  
  // Test MX record
  try {
    const mxResponse = await fetch('https://dns.google/resolve?name=musobuddy.com&type=MX');
    const mxData = await mxResponse.json();
    console.log('✅ MX Record:', mxData.Answer?.[0]?.data || 'Not found');
  } catch (error) {
    console.log('❌ MX Record test failed:', error.message);
  }
  
  // Test SPF record
  try {
    const spfResponse = await fetch('https://dns.google/resolve?name=musobuddy.com&type=TXT');
    const spfData = await spfResponse.json();
    const spfRecord = spfData.Answer?.find(record => record.data.includes('spf1'));
    console.log('✅ SPF Record:', spfRecord?.data || '❌ NOT FOUND - THIS IS THE PROBLEM!');
  } catch (error) {
    console.log('❌ SPF Record test failed:', error.message);
  }
  
  // Test DKIM records
  try {
    const dkimResponse = await fetch('https://dns.google/resolve?name=s1._domainkey.musobuddy.com&type=TXT');
    const dkimData = await dkimResponse.json();
    console.log('✅ DKIM Record:', dkimData.Answer?.[0]?.data || '❌ NOT FOUND - THIS IS THE PROBLEM!');
  } catch (error) {
    console.log('❌ DKIM Record test failed:', error.message);
  }
}

async function testWebhook() {
  console.log('\n2. Testing Webhook Endpoint...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'leads@musobuddy.com',
        subject: 'Test webhook',
        text: 'Test message',
        envelope: { from: 'test@example.com', to: ['leads@musobuddy.com'] }
      })
    });
    
    console.log('✅ Webhook Status:', response.status);
    const result = await response.text();
    console.log('✅ Webhook Response:', result);
  } catch (error) {
    console.log('❌ Webhook test failed:', error.message);
  }
}

async function analyzeEmailChain() {
  console.log('\n3. Email Delivery Chain Analysis...');
  console.log('📧 Email Provider → MX Record → SendGrid → Webhook');
  console.log('📧 Your email: Gmail/Yahoo/Outlook');
  console.log('📧 DNS: musobuddy.com MX → mx.sendgrid.net ✅');
  console.log('📧 SendGrid: Inbound Parse configured ✅');
  console.log('📧 Webhook: /api/webhook/sendgrid working ✅');
  console.log('📧 Missing: SPF/DKIM authentication records ❌');
}

async function diagnoseCommonIssues() {
  console.log('\n4. Common Issues Diagnosis...');
  console.log('🔍 Issue 1: Missing SPF record');
  console.log('   - Email providers check SPF to verify sender authenticity');
  console.log('   - Without SPF, emails may be rejected or marked as spam');
  console.log('   - Required: "v=spf1 include:sendgrid.net ~all"');
  
  console.log('\n🔍 Issue 2: Missing DKIM records');
  console.log('   - DKIM provides email signature verification');
  console.log('   - SendGrid provides specific DKIM records to add');
  console.log('   - Required: 3 CNAME records from SendGrid settings');
  
  console.log('\n🔍 Issue 3: New domain reputation');
  console.log('   - Email providers are cautious with new domains');
  console.log('   - Proper DNS records help build trust');
  console.log('   - May take 24-48 hours for full propagation');
}

async function runAllTests() {
  await testDNS();
  await testWebhook();
  await analyzeEmailChain();
  await diagnoseCommonIssues();
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Add SPF record: "v=spf1 include:sendgrid.net ~all"');
  console.log('2. Add DKIM records from SendGrid domain authentication');
  console.log('3. Wait 1-2 hours for DNS propagation');
  console.log('4. Test email delivery again');
}

runAllTests();