// Test GET endpoint specifically
console.log('Testing GET endpoint for webhook...');

fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
  method: 'GET'
})
.then(response => {
  console.log('GET Response Status:', response.status);
  console.log('GET Response Headers:', Object.fromEntries(response.headers.entries()));
  return response.text();
})
.then(data => {
  console.log('GET Response Body:', data);
  
  try {
    const json = JSON.parse(data);
    if (json.status === 'webhook_active') {
      console.log('✅ GET endpoint working correctly');
    } else {
      console.log('📄 Unexpected response:', json);
    }
  } catch (e) {
    if (data.includes('<!DOCTYPE')) {
      console.log('❌ Still getting HTML response for GET');
    } else {
      console.log('❌ Invalid JSON response:', data.substring(0, 100));
    }
  }
})
.catch(err => console.error('GET Error:', err));