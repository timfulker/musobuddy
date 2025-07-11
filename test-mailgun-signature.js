/**
 * Test if Mailgun webhook signature validation is blocking emails
 */

async function testWithoutSignature() {
  console.log('🔍 TESTING MAILGUN WEBHOOK WITHOUT SIGNATURE');
  
  // Test with form data but no signature validation
  const formData = new URLSearchParams();
  formData.append('recipient', 'leads@musobuddy.com');
  formData.append('sender', 'user@example.com');
  formData.append('subject', 'Test Without Signature');
  formData.append('body-plain', 'Testing if signature validation is blocking emails');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/1.0'
      }
    });
    
    console.log('Response status:', response.status);
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook processed without signature:', result);
    } else {
      console.log('❌ Webhook failed:', await response.text());
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

async function testWithSignature() {
  console.log('\n🔍 TESTING MAILGUN WEBHOOK WITH SIGNATURE');
  
  // Test with Mailgun signature fields
  const formData = new URLSearchParams();
  formData.append('recipient', 'leads@musobuddy.com');
  formData.append('sender', 'user@example.com');
  formData.append('subject', 'Test With Signature');
  formData.append('body-plain', 'Testing with Mailgun signature fields');
  formData.append('timestamp', Math.floor(Date.now() / 1000).toString());
  formData.append('token', 'sample-token-123');
  formData.append('signature', 'sample-signature-456');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/1.0'
      }
    });
    
    console.log('Response status:', response.status);
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook processed with signature:', result);
    } else {
      console.log('❌ Webhook failed with signature:', await response.text());
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

async function runTests() {
  await testWithoutSignature();
  await testWithSignature();
  
  console.log('\n🔍 DIAGNOSIS:');
  console.log('If both tests work, the webhook is fine.');
  console.log('The issue is likely:');
  console.log('1. Mailgun route configuration');
  console.log('2. Domain not properly configured');
  console.log('3. Mailgun not sending emails to the webhook');
  console.log('\nCheck your Mailgun control panel for:');
  console.log('• Routes configuration');
  console.log('• Domain verification status');
  console.log('• Logs showing delivery attempts');
}

runTests();