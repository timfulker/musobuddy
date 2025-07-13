/**
 * Investigate email deduplication patterns
 */

async function investigateDeduplication() {
  console.log('🔍 EMAIL DEDUPLICATION INVESTIGATION');
  console.log('===================================');
  
  // Send the exact same email content multiple times to see if behavior changes
  const testEmail = {
    'recipient': 'leads@musobuddy.com',
    'sender': 'timfulkermusic@gmail.com',
    'from': 'Tim Fulker <timfulkermusic@gmail.com>',
    'subject': 'Wedding Gig Enquiry - August 15th',
    'body-plain': 'Hi, I need a saxophone player for a wedding on August 15th at The Grand Hotel. Please let me know your availability and rates. Thanks, Tim',
    'timestamp': Math.floor(Date.now() / 1000).toString(),
    'token': 'duplicate-test-token',
    'signature': 'duplicate-test-signature'
  };
  
  console.log('\n📧 Sending same email 3 times to test deduplication behavior:');
  
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- Attempt ${i} ---`);
    
    try {
      const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mailgun'
        },
        body: new URLSearchParams(testEmail).toString()
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ SUCCESS - Enquiry ${result.enquiryId} created`);
        console.log(`   Client: ${result.clientName}`);
        console.log(`   Processing: ${result.processing}`);
      } else {
        console.log(`❌ FAILED - Status: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }
    
    // Wait 1 second between attempts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📧 Now sending with empty fields to simulate real email behavior:');
  
  const emptyEmail = {
    'timestamp': Math.floor(Date.now() / 1000).toString(),
    'token': 'empty-test-token',
    'signature': 'empty-test-signature'
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun'
      },
      body: new URLSearchParams(emptyEmail).toString()
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Empty email created enquiry ${result.enquiryId}`);
      console.log(`   Client: ${result.clientName}`);
      console.log(`   Processing: ${result.processing}`);
    } else {
      console.log(`❌ FAILED - Status: ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
  
  console.log('\n🔍 Check database to see if all enquiries were created or if some were deduplicated');
}

investigateDeduplication();