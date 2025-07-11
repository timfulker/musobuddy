/**
 * Test the exact webhook URL from Mailgun route
 */

async function testExactURL() {
  console.log('Testing exact webhook URL for Mailgun catch-all route...');
  
  const testData = {
    recipient: 'leads@musobuddy.com',
    sender: 'test@example.com',
    subject: 'Catch-all Route Test',
    'body-plain': 'Testing catch-all routing configuration'
  };
  
  const webhookURL = 'https://musobuddy.replit.app/api/webhook/mailgun';
  
  try {
    console.log('Testing URL:', webhookURL);
    
    const response = await fetch(webhookURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mailgun/Route-Test'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS - Webhook accessible:', result);
      
      if (result.enquiryId) {
        console.log(`🎉 Created enquiry #${result.enquiryId}`);
        console.log('✅ This proves the webhook URL is correct for catch-all routing!');
        
        console.log('\n📧 MAILGUN CATCH-ALL ROUTE CONFIG:');
        console.log('Expression: catch_all()');
        console.log('Action: forward("https://musobuddy.replit.app/api/webhook/mailgun")');
        console.log('Priority: 0');
        console.log('Status: Active');
        
        console.log('\n🔧 IF STILL NOT WORKING:');
        console.log('1. Check if route is Active in Mailgun dashboard');
        console.log('2. Verify domain is fully verified (all DNS records green)');
        console.log('3. Check Mailgun logs for delivery attempts');
        console.log('4. Ensure no other routes are conflicting');
      }
    } else {
      const error = await response.text();
      console.log('❌ ERROR:', error);
    }
    
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testExactURL();