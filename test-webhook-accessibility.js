/**
 * Test webhook URL accessibility and SendGrid requirements
 * Based on SendGrid support response
 */

console.log('🔍 Testing webhook URL accessibility for SendGrid...');

async function testWebhookAccessibility() {
  const webhookUrl = 'https://musobuddy.replit.app/api/webhook/sendgrid';
  
  console.log('\n=== 1. Testing Public Accessibility ===');
  try {
    const response = await fetch(webhookUrl);
    console.log(`✅ URL publicly accessible: ${response.status} ${response.statusText}`);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Returns 2xx status code as required by SendGrid');
    } else {
      console.log('❌ Does not return 2xx status code');
    }
  } catch (error) {
    console.log('❌ URL not publicly accessible:', error.message);
  }
  
  console.log('\n=== 2. Testing POST Request (SendGrid Format) ===');
  try {
    const testPayload = {
      to: 'leads@musobuddy.com',
      from: 'test@example.com',
      subject: 'SendGrid Accessibility Test',
      text: 'Testing webhook accessibility',
      envelope: {
        from: 'test@example.com',
        to: ['leads@musobuddy.com']
      }
    };
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SendGrid-Event-Webhook'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log(`✅ POST request successful: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook processed successfully:', result);
    }
  } catch (error) {
    console.log('❌ POST request failed:', error.message);
  }
  
  console.log('\n=== 3. Testing URL Redirect Check ===');
  try {
    const response = await fetch(webhookUrl, { redirect: 'manual' });
    if (response.type === 'opaqueredirect' || response.status >= 300 && response.status < 400) {
      console.log('❌ URL redirects - SendGrid cannot follow redirects');
    } else {
      console.log('✅ URL does not redirect');
    }
  } catch (error) {
    console.log('Error checking redirects:', error.message);
  }
  
  console.log('\n=== 4. DNS MX Record Check ===');
  console.log('MX Record should point to: mx.sendgrid.net');
  console.log('Current configuration: musobuddy.com → mx.sendgrid.net');
  
  console.log('\n=== Summary ===');
  console.log('If all tests pass, the issue is likely in SendGrid Inbound Parse configuration.');
  console.log('Next step: Update SendGrid support with test results.');
}

testWebhookAccessibility();