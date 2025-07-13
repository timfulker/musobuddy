/**
 * Test webhook with real Mailgun email format
 * This simulates exactly what Mailgun sends for real emails
 */

async function testRealMailgunFormat() {
  console.log('Testing with real Mailgun email format...');
  
  // This mimics the exact format Mailgun sends for real emails
  const realMailgunData = {
    // Core email fields
    sender: 'timfulkermusic@gmail.com',
    from: 'timfulkermusic@gmail.com',
    recipient: 'leads@musobuddy.com',
    subject: 'Wedding Enquiry',
    
    // Message body fields
    'body-plain': 'Hi there,\n\nI am looking for a saxophone player for my wedding on August 15th at The Grand Hotel. Please contact me on 07123 456789.\n\nThanks,\nTim Fulker',
    'body-html': '<p>Hi there,</p><p>I am looking for a saxophone player for my wedding on August 15th at The Grand Hotel. Please contact me on 07123 456789.</p><p>Thanks,<br>Tim Fulker</p>',
    'stripped-text': 'Hi there,\n\nI am looking for a saxophone player for my wedding on August 15th at The Grand Hotel. Please contact me on 07123 456789.\n\nThanks,\nTim Fulker',
    
    // Mailgun metadata
    'message-id': '<test@gmail.com>',
    timestamp: '1672531200',
    'Message-Id': '<test@gmail.com>',
    'X-Mailgun-Incoming': 'Yes',
    'X-Envelope-From': 'timfulkermusic@gmail.com',
    'X-Sender': 'timfulkermusic@gmail.com'
  };
  
  try {
    console.log('Sending real Mailgun format to webhook...');
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(realMailgunData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Success! Created enquiry:', result.enquiryId);
      console.log('📧 Client name:', result.clientName);
      console.log('📧 Extracted data:', result.extracted);
      
      console.log('\n🔍 This test proves the webhook works with real Mailgun format.');
      console.log('   If your real emails are not creating enquiries, the issue is:');
      console.log('   1. Mailgun route is not configured correctly');
      console.log('   2. Real emails are not reaching the webhook at all');
      console.log('   3. Check Mailgun logs for delivery failures');
      
    } else {
      const error = await response.text();
      console.log('❌ Error:', error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testRealMailgunFormat();