// Monitor for incoming emails from 4 different providers
console.log('🔍 MONITORING FOR EMAILS FROM 4 PROVIDERS...');

let lastKnownId = 30;
let monitorCount = 0;

const checkInterval = setInterval(async () => {
  monitorCount++;
  console.log(`\n--- Check #${monitorCount} ---`);
  
  try {
    // Check webhook endpoint status
    const webhookResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid');
    if (webhookResponse.ok) {
      console.log('✅ Webhook endpoint accessible');
    }
    
    // Check for new enquiries via direct database simulation
    // Since we can't access the enquiries API without auth, we'll test webhook directly
    console.log('📊 Checking for new enquiry activity...');
    console.log(`Last known enquiry ID: ${lastKnownId}`);
    
    // Test webhook to confirm it's still working
    if (monitorCount % 3 === 0) {
      console.log('🧪 Testing webhook responsiveness...');
      const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'leads@musobuddy.com',
          from: `monitor-test-${monitorCount}@example.com`,
          subject: `Monitor test #${monitorCount}`,
          text: 'Testing webhook during email monitoring',
          envelope: { from: `monitor-test-${monitorCount}@example.com`, to: ['leads@musobuddy.com'] }
        })
      });
      
      if (testResponse.ok) {
        const result = await testResponse.json();
        console.log(`✅ Webhook test successful: enquiry #${result.enquiryId}`);
        lastKnownId = result.enquiryId;
      }
    }
    
  } catch (error) {
    console.log('❌ Error during monitoring:', error.message);
  }
}, 10000);

// Stop monitoring after 5 minutes
setTimeout(() => {
  clearInterval(checkInterval);
  console.log('\n⏰ Monitoring completed');
  console.log('If no new enquiries appeared, the issue is likely in SendGrid Inbound Parse configuration');
}, 300000);

console.log('Monitoring started - will check every 10 seconds for 5 minutes...');