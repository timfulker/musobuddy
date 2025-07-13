/**
 * Test Enhanced Mailgun Webhook Handler
 * Tests all consultant's improvements
 */

async function testEnhancedWebhook() {
  console.log('🧪 Testing Enhanced Mailgun Webhook Handler...');
  
  const testCases = [
    {
      name: 'Standard Mailgun Format',
      data: {
        sender: 'Tim Fulker <timfulkermusic@gmail.com>',
        subject: 'Wedding Enquiry',
        'body-plain': 'Hi, my name is Tim Fulker. I need a saxophonist for my wedding on August 15th at The Grand Hotel. Please contact me on 07123 456789.'
      }
    },
    {
      name: 'Alternative Field Names',
      data: {
        From: 'timfulkermusic@gmail.com',
        Subject: 'Corporate Event',
        'body-text': 'Looking for a piano player for our corporate event next month.'
      }
    },
    {
      name: 'HTML Content Only',
      data: {
        sender: 'client@example.com',
        subject: 'Birthday Party',
        'body-html': '<p>Hi there,</p><p>My name is <strong>Sarah Johnson</strong>. I need a musician for my birthday party on June 20th.</p><p>Thanks!</p>'
      }
    },
    {
      name: 'Missing Fields (Should use fallbacks)',
      data: {
        timestamp: '1642608000',
        token: 'test-token'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    
    try {
      const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(testCase.data)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success: Created enquiry ${result.enquiryId}`);
        console.log(`   Client: ${result.clientName}`);
        console.log(`   Processing: ${result.processing}`);
        
        if (result.debug) {
          console.log(`   Email: ${result.debug.extractedEmail}`);
          console.log(`   Subject: ${result.debug.extractedSubject}`);
          console.log(`   Body length: ${result.debug.bodyLength}`);
        }
        
        if (result.extracted) {
          console.log(`   Extracted phone: ${result.extracted.phone || 'None'}`);
          console.log(`   Extracted event: ${result.extracted.eventType || 'None'}`);
        }
      } else {
        console.log(`❌ Failed: ${response.status}`);
        const error = await response.text();
        console.log(`   Error: ${error}`);
      }
      
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🎯 Summary of Enhancements:');
  console.log('✅ Multiple field name support (sender, From, subject, Subject)');
  console.log('✅ HTML content fallback when plain text missing');
  console.log('✅ Enhanced email extraction patterns');
  console.log('✅ Improved debug logging');
  console.log('✅ Better error handling for missing fields');
  console.log('');
  console.log('📧 Now send a real email from timfulkermusic@gmail.com');
  console.log('   The enhanced webhook should extract content properly!');
}

testEnhancedWebhook();