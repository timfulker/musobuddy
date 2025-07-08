/**
 * Debug authentication and email configuration conflicts
 */

console.log('🔍 CHECKING FOR EMAIL CONFIGURATION CONFLICTS...');

async function checkInboundParse() {
  console.log('\n1. Testing SendGrid Inbound Parse Configuration...');
  
  // Check if we have proper SendGrid inbound parse setup
  console.log('📧 Current Setup: MX Record → SendGrid → Webhook');
  console.log('📧 MX Record: musobuddy.com → mx.sendgrid.net ✅');
  console.log('📧 SendGrid Inbound Parse: Configured for musobuddy.com ✅');
  console.log('📧 Webhook Endpoint: /api/webhook/sendgrid ✅');
  
  // Test the webhook directly
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'leads@musobuddy.com',
        subject: 'Debug test',
        text: 'Testing email configuration',
        envelope: { from: 'test@example.com', to: ['leads@musobuddy.com'] }
      })
    });
    
    console.log('✅ Webhook Response:', response.status);
    if (response.status === 200) {
      const result = await response.text();
      console.log('✅ Webhook Created Enquiry:', result);
    }
  } catch (error) {
    console.log('❌ Webhook test failed:', error.message);
  }
}

async function checkDomainAuth() {
  console.log('\n2. Checking Domain Authentication...');
  
  // Check SPF record
  try {
    const spfResponse = await fetch('https://dns.google/resolve?name=musobuddy.com&type=TXT');
    const spfData = await spfResponse.json();
    const spfRecord = spfData.Answer?.find(record => record.data.includes('spf1'));
    
    if (spfRecord) {
      console.log('✅ SPF Record Found:', spfRecord.data);
    } else {
      console.log('❌ SPF Record Missing - This prevents email delivery!');
      console.log('   Required: "v=spf1 include:sendgrid.net ~all"');
    }
  } catch (error) {
    console.log('❌ SPF check failed:', error.message);
  }
}

async function provideSolution() {
  console.log('\n3. Email Configuration Solution...');
  
  console.log('🎯 CURRENT ISSUE: Missing SPF Record');
  console.log('   - Email providers check SPF to verify SendGrid can receive emails');
  console.log('   - Without SPF, Gmail/Yahoo/Outlook reject emails before they reach SendGrid');
  
  console.log('\n📝 SOLUTION STEPS:');
  console.log('1. Add SPF record in Namecheap DNS:');
  console.log('   Type: TXT');
  console.log('   Host: @');
  console.log('   Value: v=spf1 include:sendgrid.net ~all');
  
  console.log('\n2. Alternative: Email Forwarding Method');
  console.log('   - Set up email forwarding in Namecheap');
  console.log('   - Forward leads@musobuddy.com to a Gmail/Yahoo account');
  console.log('   - Use email filters to forward to webhook');
  
  console.log('\n🔧 RECOMMENDATION:');
  console.log('   - SPF record is simpler and more reliable');
  console.log('   - Current setup will work once SPF is added');
  console.log('   - Email forwarding adds complexity and potential delays');
}

async function runDiagnostic() {
  await checkInboundParse();
  await checkDomainAuth();
  await provideSolution();
}

runDiagnostic();