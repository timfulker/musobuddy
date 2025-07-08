// Monitor for webhook activity after DNS fix
console.log('🔍 MONITORING FOR WEBHOOK ACTIVITY (DNS FIXED)...');

let lastEnquiryId = 28; // Current max ID

async function checkForNewEnquiries() {
  const interval = setInterval(async () => {
    try {
      // Check database directly for new enquiries
      const response = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid');
      const status = await response.json();
      
      if (response.ok) {
        console.log('✅ Webhook endpoint accessible:', status.message);
        
        // Check for new enquiries by testing webhook
        const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: 'leads@musobuddy.com',
            from: 'dns-test@example.com',
            subject: 'DNS Fix Test',
            text: 'Testing after DNS propagation fix',
            envelope: { from: 'dns-test@example.com', to: ['leads@musobuddy.com'] }
          })
        });
        
        if (testResponse.ok) {
          const result = await testResponse.json();
          console.log('🎉 TEST WEBHOOK SUCCESSFUL:', result);
          
          if (result.enquiryId && result.enquiryId > lastEnquiryId) {
            console.log(`📧 New enquiry created: #${result.enquiryId}`);
            lastEnquiryId = result.enquiryId;
          }
        }
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }, 5000);
  
  // Stop after 10 minutes
  setTimeout(() => {
    clearInterval(interval);
    console.log('⏰ Monitoring stopped');
  }, 600000);
}

checkForNewEnquiries();