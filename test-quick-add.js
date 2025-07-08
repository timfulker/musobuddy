// Test the Quick Add endpoint directly
const testData = {
  clientName: "Test Client",
  clientEmail: "test@example.com",
  clientPhone: "07123456789",
  eventDate: "2025-08-15",
  venue: "Test Venue",
  estimatedValue: "500",
  notes: "Test enquiry via Quick Add",
  source: "Phone Call",
  contactMethod: "Phone"
};

console.log('Testing Quick Add endpoint...');
console.log('Test data:', testData);

fetch('https://musobuddy.replit.app/api/enquiries/quick-add', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('Response status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response data:', data);
  if (data.id) {
    console.log('✅ Quick Add working! Created enquiry ID:', data.id);
  } else {
    console.log('❌ Quick Add failed:', data.message);
  }
})
.catch(error => {
  console.error('❌ Error:', error);
});