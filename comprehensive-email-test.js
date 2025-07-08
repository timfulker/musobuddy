// Comprehensive test of webhook endpoint
console.log('=== TESTING WEBHOOK ENDPOINT ===');

// Test 1: Basic GET request
fetch('https://musobuddy.replit.app/webhook/sendgrid', {
  method: 'GET'
})
.then(response => {
  console.log('GET Response Status:', response.status);
  return response.text();
})
.then(data => {
  console.log('GET Response:', data);
})
.catch(err => {
  console.error('GET Test Failed:', err.message);
});

// Test 2: POST with URL encoded data (SendGrid format)
setTimeout(() => {
  const formData = new URLSearchParams();
  formData.append('to', 'leads@musobuddy.com');
  formData.append('from', 'test@diagnostic.com');
  formData.append('subject', 'Diagnostic Test Email');
  formData.append('text', 'Testing webhook with proper SendGrid format');

  fetch('https://musobuddy.replit.app/webhook/sendgrid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'SendGrid/1.0'
    },
    body: formData
  })
  .then(response => {
    console.log('POST Response Status:', response.status);
    return response.text();
  })
  .then(data => {
    console.log('POST Response:', data);
  })
  .catch(err => {
    console.error('POST Test Failed:', err.message);
  });
}, 2000);

// Test 3: Check if enquiry was created
setTimeout(() => {
  fetch('https://musobuddy.replit.app/api/enquiries')
  .then(response => response.json())
  .then(data => {
    console.log('Latest enquiries count:', data.length);
    if (data.length > 0) {
      console.log('Most recent enquiry:', data[data.length - 1]);
    }
  })
  .catch(err => {
    console.error('Enquiry check failed:', err.message);
  });
}, 5000);