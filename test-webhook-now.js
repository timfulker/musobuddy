// Direct test with server logs
console.log('Testing webhook after server restart...');

fetch('https://musobuddy.replit.app/webhook/sendgrid', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'TestClient/1.0'
  },
  body: 'to=leads@musobuddy.com&from=test@example.com&subject=Test&text=Test message'
})
.then(response => {
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  return response.text();
})
.then(data => {
  console.log('Response length:', data.length);
  if (data.includes('🔥 WEBHOOK ENDPOINT HIT')) {
    console.log('✅ Webhook is working!');
  } else if (data.includes('<!DOCTYPE html>')) {
    console.log('❌ Still getting HTML - webhook route not working');
  } else {
    console.log('Response preview:', data.substring(0, 100));
  }
})
.catch(err => console.error('Error:', err));