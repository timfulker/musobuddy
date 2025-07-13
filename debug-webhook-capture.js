/**
 * Debug webhook capture to see what's actually happening
 */

async function debugWebhookCapture() {
  console.log('🔍 Testing webhook capture with different scenarios...');
  
  // Test 1: Standard format that should work
  console.log('\n🧪 Test 1: Standard format');
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        sender: 'timfulkermusic@gmail.com',
        subject: 'Test Email',
        'body-plain': 'This is a test message'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Standard format worked');
      console.log(`📊 Enquiry: ${result.enquiryId}`);
      console.log(`📧 Client: ${result.clientName}`);
      console.log(`📧 Email: ${result.debug?.extractedEmail}`);
      console.log(`📧 Body length: ${result.debug?.bodyLength}`);
    } else {
      console.log('❌ Standard format failed');
    }
  } catch (error) {
    console.log('❌ Standard format error:', error.message);
  }
  
  // Test 2: Format that might match what Mailgun actually sends
  console.log('\n🧪 Test 2: Alternative format');
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'stripped-text': 'This is the email content',
        'stripped-html': '<p>This is the email content</p>',
        'message-headers': JSON.stringify([
          ['From', 'timfulkermusic@gmail.com'],
          ['Subject', 'Test Email']
        ])
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Alternative format worked');
      console.log(`📊 Enquiry: ${result.enquiryId}`);
      console.log(`📧 Client: ${result.clientName}`);
    } else {
      console.log('❌ Alternative format failed');
    }
  } catch (error) {
    console.log('❌ Alternative format error:', error.message);
  }
  
  // Test 3: Empty format (like what might be happening)
  console.log('\n🧪 Test 3: Empty format (simulating the problem)');
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        timestamp: '1642608000',
        token: 'test-token',
        signature: 'test-signature'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Empty format processed');
      console.log(`📊 Enquiry: ${result.enquiryId}`);
      console.log(`📧 Client: ${result.clientName} (should be "unknown")`);
    } else {
      console.log('❌ Empty format failed');
    }
  } catch (error) {
    console.log('❌ Empty format error:', error.message);
  }
  
  console.log('\n🔍 Analysis:');
  console.log('If Test 1 works but your real email behaves like Test 3,');
  console.log('it means Mailgun is sending different field names than expected.');
  console.log('');
  console.log('🔧 Next: Check the console for webhook inspection logs');
  console.log('Look for "🔍 === WEBHOOK DATA INSPECTION START ===" patterns');
}

debugWebhookCapture();