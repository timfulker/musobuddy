/**
 * Check webhook logs and test actual Mailgun field format
 */

async function checkWebhookLogs() {
  console.log('🔍 CHECKING WEBHOOK LOGS FOR REAL MAILGUN FORMAT');
  console.log('');
  
  // Test the current webhook with various field name formats
  const testFormats = [
    {
      name: 'Current Test Format',
      data: {
        sender: 'Tim Fulker <timfulkermusic@gmail.com>',
        subject: 'Test Subject',
        'body-plain': 'Test message content'
      }
    },
    {
      name: 'Alternative Format 1',
      data: {
        From: 'Tim Fulker <timfulkermusic@gmail.com>',
        Subject: 'Test Subject',
        'text': 'Test message content'
      }
    },
    {
      name: 'Alternative Format 2',
      data: {
        'envelope[from]': 'timfulkermusic@gmail.com',
        'envelope[to]': 'leads@mg.musobuddy.com',
        'body-plain': 'Test message content',
        'stripped-text': 'Test message content',
        'subject': 'Test Subject'
      }
    },
    {
      name: 'Mailgun Route Format',
      data: {
        recipient: 'leads@mg.musobuddy.com',
        sender: 'timfulkermusic@gmail.com',
        subject: 'Test Subject',
        'body-plain': 'Test message content',
        'stripped-text': 'Test message content',
        'body-html': '<p>Test message content</p>'
      }
    }
  ];
  
  console.log('🧪 Testing different field formats...');
  
  for (const format of testFormats) {
    console.log(`\n📧 Testing: ${format.name}`);
    
    try {
      const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(format.data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success: Created enquiry ${result.enquiryId}`);
        console.log(`   Client: ${result.clientName || 'Not extracted'}`);
        console.log(`   Email: ${result.clientEmail || 'Not extracted'}`);
        console.log(`   Subject: ${result.subject || 'Not extracted'}`);
        console.log(`   Content: ${result.content ? result.content.substring(0, 50) + '...' : 'Not extracted'}`);
        
        // Check if this format worked better
        if (result.clientName !== 'Unknown Client' && result.clientName !== 'unknown') {
          console.log(`🎯 THIS FORMAT WORKED: ${format.name}`);
        }
      } else {
        console.log(`❌ Failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n📊 ANALYSIS:');
  console.log('');
  console.log('The test above should show which field format works.');
  console.log('If ALL formats show "Unknown Client" or "unknown", then the issue is:');
  console.log('');
  console.log('1. Mailgun uses completely different field names');
  console.log('2. The webhook inspection logs will show the actual field names');
  console.log('');
  console.log('🔍 NEXT STEPS:');
  console.log('1. Check the deployment console logs for webhook inspection data');
  console.log('2. Look for "🔍 === WEBHOOK DATA INSPECTION START ===" in the logs');
  console.log('3. Find the actual field names Mailgun uses');
  console.log('4. Update the webhook to handle those field names');
  console.log('');
  console.log('The webhook is working - it just needs the right field names!');
}

checkWebhookLogs();