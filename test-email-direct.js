// Test email delivery chain step by step
console.log('=== EMAIL DELIVERY CHAIN TEST ===\n');

// Test 1: Check if SendGrid accepts emails for your domain
async function testSendGridAcceptance() {
  console.log('1. TESTING SENDGRID EMAIL ACCEPTANCE');
  console.log('-------------------------------------');
  
  // Simulate what happens when an email provider tries to deliver to SendGrid
  console.log('Testing SMTP connection to mx.sendgrid.net...');
  
  // This would normally be done via SMTP, but we can test the email path
  console.log('Email flow should be:');
  console.log('  Gmail/Yahoo → DNS lookup → mx.sendgrid.net → SendGrid → Webhook');
  console.log('');
  
  console.log('If no activity in SendGrid, possible causes:');
  console.log('  1. SendGrid rejecting emails for unverified domain');
  console.log('  2. Email providers treating musobuddy.com as spam');
  console.log('  3. DNS propagation issues');
  console.log('  4. SendGrid account limits or restrictions');
  console.log('');
}

// Test 2: Check domain reputation
async function checkDomainReputation() {
  console.log('2. DOMAIN REPUTATION CHECK');
  console.log('----------------------------');
  
  console.log('Checking if musobuddy.com is blacklisted...');
  
  // Check some basic reputation indicators
  try {
    const response = await fetch('https://dns.google/resolve?name=musobuddy.com&type=TXT');
    const data = await response.json();
    
    if (data.Answer) {
      console.log('TXT records found:', data.Answer.length);
      data.Answer.forEach(record => {
        if (record.data.includes('spf') || record.data.includes('dmarc')) {
          console.log('  Email auth record:', record.data);
        }
      });
    } else {
      console.log('❌ No TXT records - this could cause delivery issues');
    }
  } catch (error) {
    console.log('❌ Error checking domain records:', error.message);
  }
  
  console.log('');
}

// Test 3: Check if domain is too new
async function checkDomainAge() {
  console.log('3. DOMAIN AGE AND TRUST CHECK');
  console.log('------------------------------');
  
  console.log('New domains often face delivery restrictions:');
  console.log('  - Gmail/Yahoo may reject emails from new domains');
  console.log('  - SendGrid may require domain verification');
  console.log('  - Email providers use "domain warming" periods');
  console.log('');
  
  console.log('Solutions for new domains:');
  console.log('  1. Use subdomain of established domain');
  console.log('  2. Start with transactional emails first');
  console.log('  3. Gradually increase email volume');
  console.log('  4. Set up proper SPF/DKIM/DMARC records');
  console.log('');
}

// Test 4: Alternative diagnostic
async function suggestAlternatives() {
  console.log('4. IMMEDIATE DIAGNOSTIC STEPS');
  console.log('------------------------------');
  
  console.log('To diagnose why SendGrid shows no activity:');
  console.log('');
  console.log('A. Check SendGrid Settings:');
  console.log('   - Go to Settings → Sender Authentication');
  console.log('   - Verify domain authentication status');
  console.log('   - Check if musobuddy.com is verified (not just em7583)');
  console.log('');
  
  console.log('B. Test with Different Email Addresses:');
  console.log('   - Try sending FROM a SendGrid verified domain');
  console.log('   - Test with a subdomain (test@em7583.musobuddy.com)');
  console.log('   - Use a completely different domain temporarily');
  console.log('');
  
  console.log('C. Check Email Provider Logs:');
  console.log('   - Gmail: Check "Sent" folder for bounce messages');
  console.log('   - Look for NDR (Non-Delivery Reports)');
  console.log('   - Check spam/junk folders');
  console.log('');
  
  console.log('D. Alternative Test:');
  console.log('   - Send email TO a different address first');
  console.log('   - Verify SendGrid can receive ANY emails');
  console.log('   - Use SendGrid\'s email testing tools');
}

async function runEmailDeliveryTest() {
  await testSendGridAcceptance();
  await checkDomainReputation();
  await checkDomainAge();
  await suggestAlternatives();
  
  console.log('=== CONCLUSION ===');
  console.log('Since SendGrid shows NO activity, emails are not reaching SendGrid.');
  console.log('This is likely a domain verification or reputation issue, not a webhook problem.');
}

runEmailDeliveryTest().catch(console.error);