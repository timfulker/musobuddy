/**
 * Test different email formats to identify the issue
 */

async function testEmailFormats() {
  console.log('🧪 Testing different email address formats...');
  
  const testCases = [
    {
      name: 'Working Gmail Format',
      data: {
        sender: 'Tim Fulker <timfulker@gmail.com>',
        recipient: 'leads@mg.musobuddy.com',
        subject: 'Wedding Enquiry Test',
        'body-plain': 'Hi, my name is Tim Fulker. I need a saxophonist for my wedding.'
      }
    },
    {
      name: 'Problematic Music Gmail Format',
      data: {
        sender: 'Tim Fulker <timfulkermusic@gmail.com>',
        recipient: 'leads@mg.musobuddy.com', 
        subject: 'Wedding Enquiry Test',
        'body-plain': 'Hi, my name is Tim Fulker. I need a saxophonist for my wedding.'
      }
    },
    {
      name: 'Email Only Format',
      data: {
        sender: 'timfulkermusic@gmail.com',
        recipient: 'leads@mg.musobuddy.com',
        subject: 'Wedding Enquiry Test', 
        'body-plain': 'Hi, my name is Tim Fulker. I need a saxophonist for my wedding.'
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
      
      const result = await response.text();
      console.log(`📊 Status: ${response.status}`);
      
      if (response.ok) {
        try {
          const jsonResult = JSON.parse(result);
          if (jsonResult.enquiryId) {
            console.log(`✅ Created enquiry: ${jsonResult.enquiryId}`);
            console.log(`📧 Client name: ${jsonResult.clientName}`);
            if (jsonResult.debug) {
              console.log(`📧 Extracted email: ${jsonResult.debug.extractedEmail}`);
              console.log(`📧 Body length: ${jsonResult.debug.bodyLength}`);
            }
          }
        } catch (e) {
          console.log('📄 Non-JSON response');
        }
      } else {
        console.log(`❌ Error: ${result}`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('\n🧪 Testing complete!');
  console.log('Now send a real email from timfulkermusic@gmail.com and check the console logs');
}

testEmailFormats().catch(console.error);