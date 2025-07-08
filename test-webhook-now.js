// Test webhook endpoint with form data (how SendGrid sends it)
const testData = new URLSearchParams();
testData.append('to', 'leads@musobuddy.com');
testData.append('from', 'test@yahoo.com');
testData.append('subject', 'Yahoo Test Email');
testData.append('text', 'Testing from Yahoo address');

fetch('https://musobuddy.replit.app/webhook/sendgrid', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'SendGrid-Test'
  },
  body: testData
})
.then(response => response.json())
.then(data => {
  console.log('✅ Webhook test successful:', data);
})
.catch(err => {
  console.error('❌ Webhook test failed:', err);
});