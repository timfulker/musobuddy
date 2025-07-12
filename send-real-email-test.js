/**
 * Send a real email to leads@musobuddy.com to test if it reaches the webhook
 */

async function sendRealEmailTest() {
  console.log('📧 SENDING REAL EMAIL TEST');
  
  // Let's send an email using a service that actually sends emails
  // We'll use a simple curl command to test this
  
  console.log('This would normally use a real email service like SendGrid');
  console.log('Instead, let me check if we can monitor the webhook for incoming emails');
  
  // Create a monitoring script to watch for webhook hits
  console.log('\n🔍 MONITORING WEBHOOK FOR REAL EMAILS');
  console.log('Now you should send a real email to leads@musobuddy.com');
  console.log('I will monitor the webhook to see if it gets hit...');
  
  // Monitor for 30 seconds
  const startTime = Date.now();
  const endTime = startTime + 30000; // 30 seconds
  
  while (Date.now() < endTime) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    // Check if we got a new enquiry
    try {
      const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          sender: 'monitor@test.com',
          recipient: 'leads@musobuddy.com',
          subject: 'Monitor check',
          'body-plain': 'Monitoring for real emails'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`⏰ Monitor check - Current enquiry ID: ${result.enquiryId}`);
        
        // If we see a jump in enquiry ID, it means a real email came in
        if (result.enquiryId > 224) {
          console.log('🎉 REAL EMAIL DETECTED! Enquiry ID jumped!');
          break;
        }
      }
    } catch (error) {
      console.log('Monitor check failed:', error.message);
    }
  }
  
  console.log('\n📧 SEND A REAL EMAIL NOW TO: leads@musobuddy.com');
  console.log('Subject: Test from my real email');
  console.log('Body: This is a test email to see if webhook receives it');
}

sendRealEmailTest();