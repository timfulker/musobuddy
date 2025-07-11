/**
 * Test simple email webhook endpoint
 */

const testWebhook = async () => {
  try {
    console.log('Testing simple email webhook...');
    
    const response = await fetch('https://Musobuddy.replit.app/api/webhook/simple-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'test@example.com',
        to: 'leads@musobuddy.com',
        subject: 'Test Email Forwarding',
        text: 'Hello, I would like to book you for a wedding on July 15th at the Grand Hotel. Please call me at 555-1234. Thanks, John Smith'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const data = await response.json();
    console.log('Response data:', data);
    
  } catch (error) {
    console.error('Error testing webhook:', error);
  }
};

testWebhook();