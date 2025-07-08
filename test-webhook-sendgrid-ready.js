/**
 * Test webhook functionality to ensure readiness for SendGrid resolution
 */

const testPayload = {
  headers: {
    to: 'leads@musobuddy.com',
    from: 'test@example.com',
    subject: 'Test Email Forward - SendGrid Support Testing'
  },
  from: {
    email: 'test@example.com',
    name: 'Test User'
  },
  to: [{ email: 'leads@musobuddy.com' }],
  subject: 'Test Email Forward - SendGrid Support Testing',
  html: '<p>This is a test email to verify webhook functionality while SendGrid support investigates routing.</p>',
  text: 'This is a test email to verify webhook functionality while SendGrid support investigates routing.'
};

async function testWebhookReady() {
  console.log('Testing webhook readiness for SendGrid support resolution...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', result);
    
    if (response.status === 200) {
      console.log('✅ Webhook is ready for SendGrid resolution');
      
      // Check if enquiry was created
      setTimeout(async () => {
        const enquiriesResponse = await fetch('https://musobuddy.replit.app/api/enquiries');
        const enquiries = await enquiriesResponse.json();
        const testEnquiry = enquiries.find(e => e.title && e.title.includes('Test Email Forward'));
        
        if (testEnquiry) {
          console.log('✅ Test enquiry created successfully:', testEnquiry.id);
        } else {
          console.log('ℹ️  No test enquiry found (normal - depends on email parsing)');
        }
      }, 1000);
    } else {
      console.log('❌ Webhook response issue:', response.status);
    }
  } catch (error) {
    console.log('❌ Webhook test failed:', error.message);
  }
}

testWebhookReady();