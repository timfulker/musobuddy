// Check for recent enquiries and webhook activity
console.log('Checking recent enquiries...');

// Test webhook endpoint
fetch('https://musobuddy.replit.app/api/webhook/sendgrid')
  .then(response => response.json())
  .then(data => {
    console.log('Webhook endpoint status:', data);
    
    // Check recent enquiries
    return fetch('https://musobuddy.replit.app/api/enquiries');
  })
  .then(response => response.json())
  .then(enquiries => {
    console.log('Total enquiries:', enquiries.length);
    
    // Sort by ID and show latest
    const sorted = enquiries.sort((a, b) => b.id - a.id);
    console.log('Latest 3 enquiries:');
    sorted.slice(0, 3).forEach(e => {
      console.log(`  #${e.id}: ${e.title} (${e.status}) - ${e.created_at}`);
    });
  })
  .catch(error => {
    console.error('Error:', error.message);
  });