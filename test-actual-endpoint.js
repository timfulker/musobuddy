/**
 * Test the actual production endpoint that Mailgun should be hitting
 */

async function testActualEndpoint() {
  console.log('🧪 Testing actual production endpoint with different email formats...');
  
  const testCases = [
    {
      name: 'Gmail Standard Format',
      data: {
        sender: 'timfulkermusic@gmail.com',
        subject: 'Test Email',
        'body-plain': 'This is a test email from timfulkermusic@gmail.com'
      }
    },
    {
      name: 'Gmail With Display Name',
      data: {
        sender: 'Tim Fulker <timfulkermusic@gmail.com>',
        subject: 'Test Email',
        'body-plain': 'This is a test email with display name'
      }
    },
    {
      name: 'Empty Fields Test',
      data: {
        sender: '',
        subject: '',
        'body-plain': ''
      }
    },
    {
      name: 'Missing Fields Test',
      data: {
        // No sender, subject, or body-plain fields
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
      } else {
        console.log(`❌ Failed: ${response.status}`);
        const error = await response.text();
        console.log(`   Error: ${error}`);
      }
      
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);
    }
    
    // Wait between tests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🔍 Analysis:');
  console.log('- If all tests work, the webhook parsing is correct');
  console.log('- If some tests fail, it shows which field formats cause issues');
  console.log('- The "Missing Fields Test" should show what happens when Mailgun sends incomplete data');
  console.log('\n💡 The real issue might be that Mailgun is sending fields in a different format');
  console.log('   than what the webhook expects (e.g., "From" instead of "sender")');
}

testActualEndpoint();