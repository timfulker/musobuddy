/**
 * Simple webhook test to verify email processing
 */

async function testWebhook() {
  console.log('=== Simple Webhook Test ===');
  
  const testData = new URLSearchParams({
    to: 'leads@musobuddy.com',
    from: 'timfulkermusic@gmail.com',
    subject: 'Test Email from Tim',
    text: 'This is a test email to verify the webhook is working',
    envelope: '{"to":["leads@musobuddy.com"],"from":"timfulkermusic@gmail.com"}'
  });
  
  try {
    console.log('Testing webhook endpoint...');
    
    const response = await fetch('https://musobuddy.com/api/webhook/sendgrid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Test-Webhook/1.0'
      },
      body: testData.toString()
    });
    
    console.log('Status:', response.status);
    console.log('Response:', await response.text());
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testWebhook();