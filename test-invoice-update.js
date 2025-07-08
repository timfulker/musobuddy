// Test script to debug invoice update issue
const testData = {
  contractId: null,
  clientName: "Pat Davis",
  clientEmail: "timfulker@gmail.com",
  clientAddress: "291, Alder Road, Poole",
  venueAddress: "Langham House, Rode, Frome BA11 6PS",
  amount: "300.00",
  dueDate: "2025-07-05T00:00:00.000Z",
  performanceDate: "2025-07-05T00:00:00.000Z",
  performanceFee: "300.00",
  depositPaid: "0.00"
};

console.log('Test data:', JSON.stringify(testData, null, 2));

fetch('https://musobuddy.replit.app/api/invoices/47', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('Response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response data:', data);
})
.catch(error => {
  console.error('Error:', error);
});