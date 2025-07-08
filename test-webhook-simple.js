// Test what SendGrid sees when posting to our webhook
const testData = new URLSearchParams();
testData.append('to', 'leads@musobuddy.com');
testData.append('from', 'test@sendgrid.com');
testData.append('subject', 'SendGrid Delivery Test');
testData.append('text', 'Testing SendGrid webhook delivery');

fetch('https://musobuddy.replit.app/webhook/sendgrid', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'SendGrid/1.0'
  },
  body: testData
})
.then(response => {
  console.log('Status Code:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  
  if (response.status === 200) {
    console.log('✅ SendGrid sees SUCCESS (200) - thinks webhook worked');
  } else {
    console.log('❌ SendGrid sees ERROR - would retry delivery');
  }
  
  return response.text();
})
.then(data => {
  if (data.includes('<!DOCTYPE html>')) {
    console.log('🔥 PROBLEM: SendGrid gets HTML instead of webhook response');
    console.log('SendGrid logs this as "successful delivery" but email is lost');
  } else {
    console.log('✅ Proper webhook response received');
  }
})
.catch(err => {
  console.error('Request failed:', err.message);
  console.log('❌ SendGrid would see network error and retry');
});