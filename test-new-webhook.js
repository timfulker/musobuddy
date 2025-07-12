/**
 * Test the new webhook endpoint to verify it's working
 */

import fetch from 'node-fetch';

async function testNewWebhook() {
  console.log('🧪 Testing new webhook endpoint...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun-test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        sender: 'test@example.com',
        subject: 'Test Subject',
        'body-plain': 'Test body content'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Response JSON:', responseJson);
    } catch (e) {
      console.log('Response is not valid JSON');
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

testNewWebhook();