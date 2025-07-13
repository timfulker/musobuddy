/**
 * Test to compare our webhook tests vs real Mailgun behavior
 */

async function testWebhookComparison() {
  console.log('🔍 WEBHOOK COMPARISON TEST');
  console.log('=========================');
  
  // Test 1: Our test format
  console.log('\n📧 Test 1: Our test format');
  const testData = {
    'recipient': 'leads@musobuddy.com',
    'sender': 'test@example.com',
    'from': 'Test User <test@example.com>',
    'subject': 'Test Email',
    'body-plain': 'This is a test email with content.',
    'stripped-text': 'This is a test email with content.',
    'timestamp': Math.floor(Date.now() / 1000).toString(),
    'token': 'test-token',
    'signature': 'test-signature'
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun'
      },
      body: new URLSearchParams(testData).toString()
    });
    
    console.log('Status:', response.status);
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS - Test format worked');
      console.log('Enquiry ID:', result.enquiryId);
      console.log('Client Name:', result.clientName);
      console.log('Processing:', result.processing);
    } else {
      console.log('❌ FAILED');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 2: Minimal format (what real Mailgun might send)
  console.log('\n📧 Test 2: Minimal format');
  const minimalData = {
    // Maybe real Mailgun only sends these fields?
    'To': 'leads@musobuddy.com',
    'From': 'real@email.com',
    'Subject': 'Real Email Subject',
    'text': 'Real email content here',
    'html': '<p>Real email content here</p>'
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun'
      },
      body: new URLSearchParams(minimalData).toString()
    });
    
    console.log('Status:', response.status);
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS - Minimal format worked');
      console.log('Enquiry ID:', result.enquiryId);
      console.log('Client Name:', result.clientName);
      console.log('Processing:', result.processing);
    } else {
      console.log('❌ FAILED');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  // Test 3: Empty format (what might cause fallback)
  console.log('\n📧 Test 3: Empty format');
  const emptyData = {
    'unknown-field': 'unknown-value'
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun'
      },
      body: new URLSearchParams(emptyData).toString()
    });
    
    console.log('Status:', response.status);
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS - Empty format triggered fallback');
      console.log('Enquiry ID:', result.enquiryId);
      console.log('Client Name:', result.clientName);
      console.log('Processing:', result.processing);
    } else {
      console.log('❌ FAILED');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('\n🔍 Check the latest enquiries to see what was created');
}

testWebhookComparison();