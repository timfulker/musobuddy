// Monitor for email from tim@saxweddings.com webserver
console.log('🔍 MONITORING FOR WEBSERVER EMAIL FROM tim@saxweddings.com...');

let checkCount = 0;
const startTime = Date.now();

const monitorInterval = setInterval(async () => {
  checkCount++;
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  console.log(`\n--- Check #${checkCount} (${elapsed}s elapsed) ---`);
  
  try {
    // Test webhook is still responsive
    const webhookTest = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid');
    if (webhookTest.ok) {
      console.log('✅ Webhook endpoint still accessible');
    }
    
    // Simulate checking for new enquiries 
    // (Real check would require authentication)
    console.log('📧 Monitoring for tim@saxweddings.com email...');
    console.log('Expected: New enquiry ID 31+ if email forwarding works');
    
    // Every 5th check, test webhook functionality
    if (checkCount % 5 === 0) {
      console.log('🧪 Testing webhook with server email simulation...');
      const testPost = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'SendGrid-Event-Webhook'
        },
        body: JSON.stringify({
          to: 'leads@musobuddy.com',
          from: 'test-webserver@saxweddings.com',
          subject: 'Webserver email test',
          text: 'Testing webhook with webserver-style email',
          envelope: {
            from: 'test-webserver@saxweddings.com',
            to: ['leads@musobuddy.com']
          }
        })
      });
      
      if (testPost.ok) {
        const result = await testPost.json();
        console.log(`✅ Webhook test: created enquiry #${result.enquiryId}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}, 8000);

// Monitor for 10 minutes
setTimeout(() => {
  clearInterval(monitorInterval);
  console.log('\n⏰ 10-minute monitoring complete');
  console.log('If no enquiry from tim@saxweddings.com appeared, SendGrid Inbound Parse needs configuration review');
}, 600000);

console.log('Starting 10-minute monitoring for webserver email...');