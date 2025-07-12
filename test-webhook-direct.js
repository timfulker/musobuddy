/**
 * Test the priority webhook endpoint directly
 */
console.log('🧪 Testing bulletproof webhook directly...');

const testData = {
  sender: 'test@example.com',
  recipient: 'leads@musobuddy.com',
  subject: 'Test Subject',
  'body-plain': 'Test message content'
};

fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'BulletproofTest/1.0'
  },
  body: new URLSearchParams(testData)
}).then(response => {
  console.log('Response Status:', response.status);
  return response.text();
}).then(text => {
  console.log('Response Body:', text);
  console.log('🧪 Test completed.');
}).catch(error => {
  console.error('Request failed:', error.message);
});