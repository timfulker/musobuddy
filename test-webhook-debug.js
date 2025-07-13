/**
 * Debug webhook endpoint to test email parsing
 */
const fetch = require('node-fetch');

async function testWebhook() {
  console.log('Testing webhook with sample data...');
  
  const testData = {
    sender: 'timfulkermusic@gmail.com',
    subject: 'Test Subject',
    'body-plain': 'Hi Tim, are you available on September 10th for a wedding in Brighton'
  };
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(testData).toString()
    });
    
    const result = await response.json();
    console.log('Response:', result);
    
    if (response.ok) {
      console.log('✅ Webhook test successful');
    } else {
      console.log('❌ Webhook test failed');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWebhook();