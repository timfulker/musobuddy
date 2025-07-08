// Monitor DNS and email activity after Namecheap confirmation
console.log('🔍 MONITORING AFTER NAMECHEAP DNS CONFIRMATION...');

async function monitorDNSAndEmails() {
  console.log('1. Testing webhook endpoint...');
  
  try {
    // Test webhook endpoint
    const webhookResponse = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid');
    const webhookData = await webhookResponse.json();
    console.log('✅ Webhook Status:', webhookData.status);
    
    console.log('\n2. Testing POST to webhook...');
    const testPost = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SendGrid-Event-Webhook'
      },
      body: JSON.stringify({
        to: 'leads@musobuddy.com',
        from: 'test-after-namecheap@example.com',
        subject: 'Test after Namecheap DNS confirmation',
        text: 'Testing webhook after DNS verification by Namecheap support',
        envelope: {
          from: 'test-after-namecheap@example.com',
          to: ['leads@musobuddy.com']
        }
      })
    });
    
    if (testPost.ok) {
      const result = await testPost.json();
      console.log('✅ Webhook Test Result:', result);
    } else {
      console.log('❌ Webhook test failed:', testPost.status);
    }
    
    console.log('\n📧 System confirmed ready by Namecheap support');
    console.log('🎯 Send email now from timfulkermusic@gmail.com to leads@musobuddy.com');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

monitorDNSAndEmails();