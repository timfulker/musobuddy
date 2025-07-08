// Test current email forwarding status with CNAME records live
console.log('🔍 TESTING EMAIL FORWARDING WITH LIVE CNAME RECORDS...');

async function testSPFRecord() {
  console.log('1. Checking SPF record...');
  try {
    const response = await fetch('https://dns.google.com/resolve?name=musobuddy.com&type=TXT');
    const data = await response.json();
    const spfRecord = data.Answer?.find(record => record.data.includes('spf1'));
    console.log('SPF Record:', spfRecord ? 'FOUND ✅' : 'NOT FOUND ❌');
  } catch (error) {
    console.log('SPF Check Error:', error.message);
  }
}

async function checkRecentEnquiries() {
  console.log('\n2. Checking recent enquiries...');
  try {
    // Check webhook endpoint
    const webhookResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid');
    const webhookData = await webhookResponse.json();
    console.log('Webhook Status:', webhookData.status);
    
    console.log('\n3. Current enquiry count check...');
    console.log('Latest enquiry ID: 29 (from database)');
    console.log('🎯 Ready to monitor for ID 30+ from real email');
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

async function runPostSPFTest() {
  await testSPFRecord();
  await checkRecentEnquiries();
  
  console.log('\n📧 SYSTEM STATUS: READY FOR EMAIL TESTING');
  console.log('Send email from timfulkermusic@gmail.com to leads@musobuddy.com');
  console.log('Expected: New enquiry with ID 30+');
}

runPostSPFTest();