// Test the invoice update right now
import https from 'https';

const testData = {
  contractId: null,
  clientName: "Test Update Now",
  clientEmail: "test@example.com",
  clientAddress: "123 Test St",
  venueAddress: "456 Venue Ave",
  amount: "100.00",
  dueDate: "2025-08-01",
  performanceDate: "2025-08-01",
  performanceFee: "100.00",
  depositPaid: "0.00"
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'musobuddy.replit.app',
  port: 443,
  path: '/api/invoices/47',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('Making PATCH request to:', options.hostname + options.path);

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(postData);
req.end();