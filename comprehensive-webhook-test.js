/**
 * Comprehensive webhook test to capture exact Mailgun format
 */

async function comprehensiveWebhookTest() {
  console.log('🔍 COMPREHENSIVE WEBHOOK TEST');
  console.log('Testing all possible Mailgun field combinations...');
  
  // Test with every possible Mailgun field name
  const testCases = [
    {
      name: 'Gmail-style sender',
      data: {
        sender: 'Tim Fulker <timfulkermusic@gmail.com>',
        subject: 'Wedding Saxophone Enquiry',
        'body-plain': 'Hi, my name is Tim Fulker. I need a saxophonist for my wedding on August 15th at The Grand Hotel. Please contact me on 07123 456789.'
      }
    },
    {
      name: 'Stripped text format',
      data: {
        'stripped-text': 'Hi, my name is Tim Fulker. I need a saxophonist for my wedding.',
        'stripped-html': '<p>Hi, my name is Tim Fulker. I need a saxophonist for my wedding.</p>',
        'message-headers': JSON.stringify([
          ['From', 'timfulkermusic@gmail.com'],
          ['Subject', 'Wedding Enquiry']
        ])
      }
    },
    {
      name: 'Raw headers format',
      data: {
        From: 'timfulkermusic@gmail.com',
        Subject: 'Wedding Enquiry',
        'body-plain': 'Hi, my name is Tim Fulker. I need a saxophonist.'
      }
    },
    {
      name: 'Alternative body fields',
      data: {
        from: 'timfulkermusic@gmail.com',
        subject: 'Wedding Enquiry',
        text: 'Hi, my name is Tim Fulker. I need a saxophonist.',
        'body-text': 'Alternative body text field'
      }
    },
    {
      name: 'HTML only format',
      data: {
        sender: 'timfulkermusic@gmail.com',
        subject: 'Wedding Enquiry',
        'body-html': '<div>Hi, my name is <strong>Tim Fulker</strong>. I need a saxophonist for my wedding.</div>'
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('📤 Sending data:', JSON.stringify(testCase.data, null, 2));
    
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
        console.log('✅ SUCCESS:');
        console.log(`   📊 Enquiry ID: ${result.enquiryId}`);
        console.log(`   👤 Client Name: ${result.clientName}`);
        console.log(`   📧 Email: ${result.debug?.extractedEmail || 'undefined'}`);
        console.log(`   📝 Subject: ${result.debug?.extractedSubject || 'undefined'}`);
        console.log(`   📄 Body Length: ${result.debug?.bodyLength || 'undefined'}`);
        console.log(`   🎯 Processing: ${result.processing || 'undefined'}`);
        
        if (result.extracted) {
          console.log(`   📞 Phone: ${result.extracted.phone || 'None'}`);
          console.log(`   📅 Event: ${result.extracted.eventType || 'None'}`);
          console.log(`   🏢 Venue: ${result.extracted.venue || 'None'}`);
        }
      } else {
        console.log(`❌ FAILED: ${response.status}`);
        const error = await response.text();
        console.log(`   Error: ${error}`);
      }
      
    } catch (error) {
      console.error(`❌ REQUEST FAILED: ${error.message}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎯 ANALYSIS:');
  console.log('The test that produces the most complete extraction');
  console.log('shows us exactly what format your real email should match.');
  console.log('');
  console.log('💡 If ALL tests show "undefined" for debug fields,');
  console.log('   it means the webhook response structure needs fixing.');
  console.log('');
  console.log('💡 If some tests work but others don\'t,');
  console.log('   it reveals which field names Mailgun is actually using.');
  console.log('');
  console.log('🔍 Next: Check server console for detailed webhook inspection logs');
}

comprehensiveWebhookTest();