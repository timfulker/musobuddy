// Test the webhook endpoint directly to verify it's working
console.log('Testing webhook endpoint directly...');

// Test GET request
fetch('https://musobuddy.replit.app/webhook/sendgrid', {
  method: 'GET',
  headers: {
    'User-Agent': 'SendGrid-Test'
  }
})
.then(response => response.json())
.then(data => {
  console.log('✅ GET test successful:', data);
})
.catch(err => {
  console.error('❌ GET test failed:', err);
});

// Test POST request with form data (simulating SendGrid)
const formData = new FormData();
formData.append('to', 'leads@musobuddy.com');
formData.append('from', 'test@example.com');
formData.append('subject', 'Direct Test Email');
formData.append('text', 'Testing webhook endpoint directly');

fetch('https://musobuddy.replit.app/webhook/sendgrid', {
  method: 'POST',
  body: formData,
  headers: {
    'User-Agent': 'SendGrid-Webhook'
  }
})
.then(response => response.json())
.then(data => {
  console.log('✅ POST test successful:', data);
})
.catch(err => {
  console.error('❌ POST test failed:', err);
});

setTimeout(() => {
  console.log('\n=== DIAGNOSTIC SUMMARY ===');
  console.log('If both tests pass, the webhook is working correctly.');
  console.log('If emails still don\'t reach SendGrid, the issue is:');
  console.log('1. SendGrid domain verification pending');
  console.log('2. Email provider DNS caching');
  console.log('3. SendGrid Inbound Parse configuration');
  console.log('4. Email routing at provider level');
}, 3000);