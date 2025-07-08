// Test if SendGrid is properly accepting emails for the domain
console.log('🔍 TESTING EMAIL DELIVERY CHAIN...');

async function testSendGridAcceptance() {
  console.log('\n1. Testing if SendGrid accepts emails for musobuddy.com...');
  
  // This won't work directly but shows the concept
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: 'leads@musobuddy.com' }],
          subject: 'Test email delivery'
        }],
        from: { email: 'test@gmail.com' },
        content: [{ type: 'text/plain', value: 'Testing email delivery' }]
      })
    });
    
    console.log('SendGrid API response:', response.status);
  } catch (error) {
    console.log('SendGrid API test failed:', error.message);
  }
}

async function checkDomainReputation() {
  console.log('\n2. Checking domain reputation indicators...');
  
  // Check if domain is accessible
  try {
    const response = await fetch('https://musobuddy.com');
    console.log(`✅ Domain accessible: ${response.status}`);
  } catch (error) {
    console.log(`❌ Domain not accessible: ${error.message}`);
  }
}

async function checkDomainAge() {
  console.log('\n3. Domain age considerations...');
  console.log('📧 New domains often face email delivery challenges');
  console.log('📧 Gmail/Yahoo/Outlook are strict with new domains');
  console.log('📧 Consider using a subdomain of an established domain');
}

async function suggestAlternatives() {
  console.log('\n4. Potential solutions:');
  console.log('🔧 Option 1: Wait 24-48 hours for DNS/reputation settling');
  console.log('🔧 Option 2: Try Premium DNS for better email routing');
  console.log('🔧 Option 3: Use a subdomain of an established domain');
  console.log('🔧 Option 4: Test with different email providers');
  console.log('🔧 Option 5: Contact SendGrid support for domain verification');
}

async function runEmailDeliveryTest() {
  await testSendGridAcceptance();
  await checkDomainReputation();
  await checkDomainAge();
  await suggestAlternatives();
}

runEmailDeliveryTest();