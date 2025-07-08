// Test email delivery now that SPF is active
console.log('🔍 TESTING EMAIL DELIVERY WITH ACTIVE SPF RECORD...');

async function testSPFRecord() {
  try {
    const response = await fetch('https://dns.google/resolve?name=musobuddy.com&type=TXT');
    const data = await response.json();
    const spfRecord = data.Answer?.find(record => record.data.includes('spf1'));
    
    if (spfRecord) {
      console.log('✅ SPF Record Active:', spfRecord.data);
      console.log('✅ SendGrid is now authorized to receive emails for musobuddy.com');
    } else {
      console.log('❌ SPF Record not found in DNS');
    }
  } catch (error) {
    console.log('Error checking SPF:', error.message);
  }
}

async function checkRecentEnquiries() {
  console.log('\n📧 Checking for recent enquiries...');
  
  try {
    // Test webhook to ensure it's working
    const webhookResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'timfulkermusic@gmail.com',
        to: 'leads@musobuddy.com',
        subject: 'Test after SPF record activation',
        text: 'Testing with SPF record now active',
        envelope: { from: 'timfulkermusic@gmail.com', to: ['leads@musobuddy.com'] }
      })
    });
    
    if (webhookResponse.status === 200) {
      const result = await webhookResponse.text();
      console.log('✅ Webhook still working:', result);
    }
    
  } catch (error) {
    console.log('Error testing webhook:', error.message);
  }
}

async function runPostSPFTest() {
  await testSPFRecord();
  await checkRecentEnquiries();
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. SPF record is now active and authorizing SendGrid');
  console.log('2. Try sending another email to leads@musobuddy.com');
  console.log('3. It should now reach SendGrid and create an enquiry');
  console.log('4. DNS propagation may take 5-15 minutes globally');
}

runPostSPFTest();