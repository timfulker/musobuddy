/**
 * Debug what Mailgun actually sends vs what we expect
 */

async function testMailgunFormat() {
  console.log('🔍 Testing what Mailgun actually sends...');
  
  // Test with common Mailgun field names
  const testFormats = [
    {
      name: 'Standard Format',
      data: {
        sender: 'test@example.com',
        recipient: 'leads@musobuddy.com',
        subject: 'Test Subject',
        'body-plain': 'Test Body'
      }
    },
    {
      name: 'Alternative Format 1',
      data: {
        from: 'test@example.com',
        to: 'leads@musobuddy.com',
        subject: 'Test Subject',
        'stripped-text': 'Test Body'
      }
    },
    {
      name: 'Alternative Format 2',
      data: {
        From: 'test@example.com',
        To: 'leads@musobuddy.com',
        Subject: 'Test Subject',
        'body-html': '<p>Test Body</p>'
      }
    }
  ];
  
  for (const format of testFormats) {
    console.log(`\n📧 Testing ${format.name}...`);
    
    try {
      const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(format.data)
      });
      
      const result = await response.json();
      console.log(`✅ ${format.name} - Enquiry ID: ${result.enquiryId}`);
      console.log(`   Subject: ${result.subject}`);
      console.log(`   From: ${result.from}`);
      
    } catch (error) {
      console.error(`❌ ${format.name} failed:`, error);
    }
  }
}

testMailgunFormat();