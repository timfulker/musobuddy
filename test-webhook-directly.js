/**
 * Test webhook endpoint directly to debug routing
 */

const testWebhook = async () => {
  console.log('Testing webhook endpoint...');
  
  const testData = {
    sender: 'test@example.com',
    recipient: 'leads@musobuddy.com',
    subject: 'Test Email',
    'body-plain': 'This is a test email for webhook testing',
    timestamp: Date.now().toString()
  };
  
  try {
    const response = await fetch('https://Musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun-Test'
      },
      body: new URLSearchParams(testData).toString()
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response:', responseText);
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(responseText);
      console.log('Parsed JSON:', jsonData);
    } catch (e) {
      console.log('Response is not JSON, first 200 chars:', responseText.substring(0, 200));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
};

testWebhook();