// Test the webhook immediately after server restart
console.log('Testing webhook with comprehensive logging...');

setTimeout(() => {
  fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'TestClient/1.0'
    },
    body: 'to=leads@musobuddy.com&from=testuser@example.com&subject=Webhook Test&text=Testing webhook logging'
  })
  .then(response => {
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    return response.text();
  })
  .then(data => {
    console.log('Response Body:', data);
    
    if (data.includes('webhook_active') || data.includes('success')) {
      console.log('✅ Webhook is working!');
    } else if (data.includes('<!DOCTYPE')) {
      console.log('❌ Still getting HTML response');
    } else {
      console.log('📄 Response:', data.substring(0, 200));
    }
  })
  .catch(err => console.error('Error:', err));
}, 3000);

// Also test GET request
setTimeout(() => {
  console.log('\nTesting GET request...');
  fetch('https://musobuddy.replit.app/api/webhook/sendgrid')
  .then(response => response.text())
  .then(data => {
    if (data.includes('webhook_active')) {
      console.log('✅ GET request working - webhook route is active');
    } else {
      console.log('❌ GET request returning:', data.substring(0, 100));
    }
  })
  .catch(err => console.error('GET Error:', err));
}, 5000);