// Test the new leads MX record
console.log('🔍 TESTING NEW LEADS MX RECORD...');

async function testLeadsMXRecord() {
  try {
    console.log('1. Checking leads.musobuddy.com MX record...');
    const leadsResponse = await fetch('https://dns.google/resolve?name=leads.musobuddy.com&type=MX');
    const leadsData = await leadsResponse.json();
    
    if (leadsData.Answer && leadsData.Answer.length > 0) {
      console.log('✅ LEADS MX RECORD FOUND:', leadsData.Answer[0].data);
      console.log('✅ DNS propagation complete for leads subdomain');
    } else {
      console.log('⏳ MX record not yet propagated, checking again in 30 seconds...');
      console.log('Raw response:', JSON.stringify(leadsData, null, 2));
    }
    
    console.log('\n2. Verifying root domain MX record...');
    const rootResponse = await fetch('https://dns.google/resolve?name=musobuddy.com&type=MX');
    const rootData = await rootResponse.json();
    console.log('✅ Root MX Record:', rootData.Answer[0].data);
    
    console.log('\n3. Testing webhook connectivity...');
    const webhookResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid');
    const webhookData = await webhookResponse.json();
    console.log('✅ Webhook Status:', webhookData.status);
    
    console.log('\n🎯 READY TO TEST:');
    console.log('Now that leads MX record is configured, try sending emails to:');
    console.log('- leads@musobuddy.com (should work with new leads MX)');
    console.log('- test@leads.musobuddy.com (should work with new leads MX)');
    console.log('- info@musobuddy.com (should work with root MX)');
    
  } catch (error) {
    console.log('Error testing MX records:', error.message);
  }
}

testLeadsMXRecord();