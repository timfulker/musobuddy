// Direct test to see exactly what's happening
console.log('Testing webhook endpoint directly...');

const testData = new URLSearchParams();
testData.append('to', 'leads@musobuddy.com');
testData.append('from', 'directtest@example.com');
testData.append('subject', 'Direct Webhook Test');
testData.append('text', 'Testing webhook processing directly');

fetch('https://musobuddy.replit.app/webhook/sendgrid', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'DirectTest/1.0'
  },
  body: testData
})
.then(response => {
  console.log('Response status:', response.status);
  console.log('Response headers:', Object.fromEntries(response.headers.entries()));
  return response.text();
})
.then(data => {
  console.log('Response body length:', data.length);
  console.log('Response preview:', data.substring(0, 200));
  
  // Check if it's JSON or HTML
  if (data.startsWith('<!DOCTYPE') || data.startsWith('<html')) {
    console.log('❌ ERROR: Received HTML instead of webhook response');
    console.log('This means the webhook route is not working');
  } else {
    console.log('✅ Received proper webhook response');
  }
})
.catch(err => {
  console.error('Request failed:', err.message);
});