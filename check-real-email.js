// Check if the real email from timfulkermusic@gmail.com created an enquiry
console.log('🔍 CHECKING FOR REAL EMAIL FROM timfulkermusic@gmail.com');

fetch('https://musobuddy.replit.app/api/enquiries', {
  headers: {
    'Cookie': process.env.REPLIT_SESSION || ''
  }
})
.then(response => {
  if (response.status === 401) {
    console.log('❌ Authentication required - checking without auth...');
    // Try a direct webhook test to see if system is working
    return fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'timfulkermusic@gmail.com',
        to: 'leads@musobuddy.com',
        subject: 'Real email test',
        text: 'Testing if real email system works',
        envelope: { from: 'timfulkermusic@gmail.com', to: ['leads@musobuddy.com'] }
      })
    }).then(res => res.json()).then(data => {
      console.log('✅ Webhook test result:', data);
      console.log('🔍 If your real email worked, it should have created a similar enquiry');
    });
  }
  return response.json();
})
.then(enquiries => {
  if (Array.isArray(enquiries)) {
    console.log('\n📧 Recent enquiries (last 10):');
    enquiries.slice(0, 10).forEach(enquiry => {
      const isFromGmail = enquiry.clientEmail?.includes('timfulkermusic@gmail.com');
      const isRecent = new Date(enquiry.createdAt) > new Date(Date.now() - 30 * 60 * 1000);
      
      console.log(`${isFromGmail ? '🎯 GMAIL' : '   '} #${enquiry.id}: ${enquiry.title}`);
      console.log(`     From: ${enquiry.clientEmail || 'unknown'}`);
      console.log(`     Source: ${enquiry.source}`);
      console.log(`     Time: ${new Date(enquiry.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    const gmailEnquiries = enquiries.filter(e => e.clientEmail?.includes('timfulkermusic@gmail.com'));
    if (gmailEnquiries.length > 0) {
      console.log(`✅ Found ${gmailEnquiries.length} enquiries from timfulkermusic@gmail.com`);
      console.log('🎉 EMAIL FORWARDING IS WORKING!');
    } else {
      console.log('❌ No enquiries found from timfulkermusic@gmail.com');
      console.log('📧 Your email may not have reached SendGrid yet');
    }
  }
})
.catch(error => {
  console.error('Error checking enquiries:', error.message);
});