// MOBILE SAFARI DEBUG COMMANDS
// Run these in the browser console to debug the token issue

// 1. Check what tokens exist
console.log('=== MOBILE TOKEN DEBUG ===');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.includes('auth')) {
    const stored = localStorage.getItem(key);
    console.log(`KEY: ${key}`);
    console.log(`VALUE: ${stored ? stored.substring(0, 50) + '...' : 'EMPTY'}`);
    console.log('---');
  }
}

// 2. Manual invoice send with token
function sendInvoiceWithToken(invoiceId, token) {
  fetch('/api/invoices/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ invoiceId: invoiceId })
  })
  .then(response => response.json())
  .then(data => console.log('SUCCESS:', data))
  .catch(error => console.log('ERROR:', error));
}

// 3. Find and use any available token
function findAndSendInvoice(invoiceId) {
  let token = null;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('auth')) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.token) {
            token = parsed.token;
            break;
          }
        } catch {
          if (typeof stored === 'string' && stored.length > 20) {
            token = stored;
            break;
          }
        }
      }
    }
  }
  
  if (token) {
    console.log('FOUND TOKEN, SENDING INVOICE...');
    sendInvoiceWithToken(invoiceId, token);
  } else {
    console.log('NO TOKEN FOUND');
  }
}

console.log('Commands available:');
console.log('findAndSendInvoice(284) - Try to send invoice 284');
console.log('sendInvoiceWithToken(284, "your_token") - Send with specific token');