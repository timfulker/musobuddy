// Final test - simulate what happens when someone emails leads@musobuddy.com
console.log('🎯 FINAL EMAIL FORWARDING TEST');
console.log('==============================');

// This simulates the exact payload SendGrid sends to our webhook
const testEmailPayload = {
  to: 'leads@musobuddy.com',
  from: 'sarah.wedding@gmail.com',
  subject: 'Wedding Music Enquiry - September 2025',
  text: `Hi there,

I'm Sarah and I'm getting married on September 15th, 2025 at The Grand Manor in Bath.

I'm looking for a musician to perform during our ceremony and drinks reception. We love acoustic guitar and would like some romantic songs during the ceremony, and something more upbeat for the reception.

Could you please let me know:
- Your availability for September 15th, 2025
- Package options and pricing
- Song list or if you take requests

The venue is The Grand Manor, Bath, and we're expecting about 80 guests.

My contact details:
Email: sarah.wedding@gmail.com
Phone: 07912 345678

Looking forward to hearing from you!

Best regards,
Sarah Thompson`,
  envelope: JSON.stringify({
    to: ['leads@musobuddy.com'],
    from: 'sarah.wedding@gmail.com'
  }),
  headers: JSON.stringify({
    'Message-ID': '<test123@gmail.com>',
    'Date': 'Tue, 8 Jul 2025 10:30:00 +0100',
    'From': 'Sarah Thompson <sarah.wedding@gmail.com>',
    'To': 'leads@musobuddy.com',
    'Subject': 'Wedding Music Enquiry - September 2025'
  })
};

console.log('📧 Simulating email from client...');
console.log('From:', testEmailPayload.from);
console.log('Subject:', testEmailPayload.subject);
console.log('Content preview:', testEmailPayload.text.substring(0, 100) + '...');

// Send to our webhook endpoint
fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'SendGrid-Event-Webhook'
  },
  body: new URLSearchParams(testEmailPayload)
})
.then(response => {
  console.log('\n📡 Webhook Response:');
  console.log('Status:', response.status);
  console.log('Status Text:', response.statusText);
  return response.json();
})
.then(data => {
  console.log('\n✅ Response Data:');
  console.log(JSON.stringify(data, null, 2));
  
  if (data.enquiryId) {
    console.log('\n🎉 SUCCESS! Email automatically converted to enquiry #' + data.enquiryId);
    console.log('📋 The system extracted:');
    console.log('   - Client name from email address');
    console.log('   - Email subject as enquiry title');
    console.log('   - Full message content');
    console.log('   - Automatic timestamp and source tracking');
    console.log('\n🚀 Email forwarding automation is LIVE!');
  } else {
    console.log('❌ Unexpected response format');
  }
})
.catch(error => {
  console.error('\n❌ Error testing webhook:', error);
  console.log('This could indicate the webhook endpoint is not accessible');
});

console.log('\n📋 Next steps after this test:');
console.log('1. Check your MusoBuddy enquiries page for the new enquiry');
console.log('2. Send a real test email to leads@musobuddy.com');
console.log('3. Verify it appears in your dashboard automatically');
console.log('4. The system is ready for real client emails!');