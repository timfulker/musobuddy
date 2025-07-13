/**
 * Test clean webhook system after removing conflicting handlers
 */

async function testCleanWebhook() {
  console.log('🧹 CLEAN WEBHOOK SYSTEM TEST');
  console.log('=============================');
  
  console.log('\n✅ Changes made:');
  console.log('- Removed server/mailgun-webhook.ts');
  console.log('- Removed server/ultra-safe-webhook.ts');
  console.log('- Removed server/parseur-webhook.ts');
  console.log('- Removed server/webhook-server.ts');
  console.log('- Removed /api/webhook/debug endpoint');
  console.log('- Removed /api/webhook/test-processing endpoint');
  
  console.log('\n📧 Testing with your email address to verify fix:');
  
  const timEmail = {
    'recipient': 'leads@musobuddy.com',
    'sender': 'timfulkermusic@gmail.com',
    'from': 'Tim Fulker <timfulkermusic@gmail.com>',
    'subject': 'Wedding Gig Enquiry - Test After Cleanup',
    'body-plain': 'Hi, this is a test email from Tim to verify the webhook cleanup worked. My name is Tim Fulker and I need a musician for a wedding.',
    'timestamp': Math.floor(Date.now() / 1000).toString(),
    'token': 'cleanup-test-token',
    'signature': 'cleanup-test-signature'
  };
  
  try {
    console.log('\n🔄 Sending test email from timfulkermusic@gmail.com...');
    
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun'
      },
      body: new URLSearchParams(timEmail).toString()
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS - Clean webhook worked!');
      console.log('   Enquiry ID:', result.enquiryId);
      console.log('   Client Name:', result.clientName);
      console.log('   Processing:', result.processing);
      
      if (result.clientName === 'Tim Fulker' && result.processing === 'enhanced-parser') {
        console.log('\n🎉 ISSUE RESOLVED!');
        console.log('   - Client name extracted correctly: Tim Fulker');
        console.log('   - Enhanced parser used (not fallback)');
        console.log('   - No more "unknown" client processing');
      } else {
        console.log('\n⚠️  Still needs attention:');
        console.log('   - Client name:', result.clientName);
        console.log('   - Processing type:', result.processing);
      }
    } else {
      console.log('❌ FAILED - Status:', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n📧 Now send real email from timfulkermusic@gmail.com to leads@musobuddy.com');
  console.log('   It should create an enquiry with proper client name extraction');
}

testCleanWebhook();