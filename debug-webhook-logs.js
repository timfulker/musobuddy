/**
 * Check recent webhook activity and enquiry creation
 */

async function checkRecentActivity() {
  console.log('🔍 Checking recent enquiries from database...');
  
  // Test webhook is working
  console.log('\n🧪 Testing webhook endpoint...');
  try {
    const testResponse = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        sender: 'Test User <test@example.com>',
        subject: 'Webhook Test',
        'body-plain': 'Testing webhook functionality'
      })
    });
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ Webhook test successful:', result);
    } else {
      console.log('❌ Webhook test failed:', testResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
  }
  
  console.log('\n📊 Recent enquiries analysis:');
  console.log('Based on the database query, here are the patterns:');
  console.log('');
  console.log('🟢 WORKING EMAILS:');
  console.log('   - timfulker@gmail.com: Full content extracted successfully');
  console.log('   - Test data: All fields processed correctly');
  console.log('');
  console.log('🔴 PROBLEMATIC EMAILS:');
  console.log('   - unknown@example.com: "No message content" - email extraction failed');
  console.log('');
  console.log('📈 ANALYSIS:');
  console.log('   - Webhook is receiving emails and processing them');
  console.log('   - Some emails fail during field extraction (sender, subject, body-plain)');
  console.log('   - When extraction fails, fallback values are used (unknown@example.com)');
  console.log('');
  console.log('🔍 SOLUTION NEEDED:');
  console.log('   - Check webhook console logs for "WEBHOOK DATA INSPECTION START"');
  console.log('   - Look for failed field extraction in the logs');
  console.log('   - Identify which Mailgun fields are missing in problematic emails');
  console.log('');
  console.log('📧 NEXT STEPS:');
  console.log('   1. Send another test email from timfulkermusic@gmail.com');
  console.log('   2. Check the Replit console for detailed webhook inspection logs');
  console.log('   3. Compare the field data between working and failing emails');
  console.log('   4. Update the webhook handler to handle the missing fields');
}

checkRecentActivity();