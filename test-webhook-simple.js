// Simple webhook test
fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
  method: 'GET'
})
.then(response => response.json())
.then(data => console.log('GET test:', data))
.catch(err => console.error('GET failed:', err));

// Test POST with form data (how SendGrid sends data)
const formData = new FormData();
formData.append('to', 'leads@musobuddy.com');
formData.append('from', 'test@example.com');
formData.append('subject', 'Test Email');
formData.append('text', 'Testing webhook functionality');

fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log('POST test:', data))
.catch(err => console.error('POST failed:', err));