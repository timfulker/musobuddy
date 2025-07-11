/**
 * Test webhook endpoint externally to verify Mailgun can reach it
 */

const testWebhook = async () => {
  console.log('Testing webhook endpoint externally...');
  
  const url = 'https://musobuddy.replit.app/api/webhook/mailgun';
  
  const testData = {
    sender: 'test@example.com',
    recipient: 'leads@musobuddy.com',
    subject: 'External webhook test',
    'body-plain': 'Testing external webhook accessibility'
  };
  
  // Convert to form data format like Mailgun sends
  const formData = new URLSearchParams();
  Object.entries(testData).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mailgun/1.0'
      },
      body: formData
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook is accessible from external sources!');
    } else {
      console.log('❌ Webhook returned error status:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error accessing webhook:', error.message);
  }
};

testWebhook();