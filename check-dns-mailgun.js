import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dns = require('dns');

console.log('Checking DNS records for mg.musobuddy.com...');

// Check MX records
dns.resolveMx('mg.musobuddy.com', (err, addresses) => {
  if (err) {
    console.error('❌ MX record error:', err.message);
  } else {
    console.log('✅ MX records found:');
    addresses.forEach(addr => {
      console.log(`  Priority: ${addr.priority}, Exchange: ${addr.exchange}`);
    });
  }
});

// Check if webhook endpoint is accessible
console.log('\nTesting webhook endpoint...');
setTimeout(() => {
  import('node-fetch').then(async ({ default: fetch }) => {
    try {
      const response = await fetch('https://musobuddy.replit.app/api/webhook/mailgun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'sender=test@example.com&subject=DNS Test&body-plain=Testing DNS'
      });
      
      if (response.ok) {
        console.log('✅ Webhook endpoint accessible');
        const result = await response.json();
        console.log('Response:', result);
      } else {
        console.log('❌ Webhook endpoint returned:', response.status);
      }
    } catch (error) {
      console.error('❌ Webhook test error:', error.message);
    }
  });
}, 1000);