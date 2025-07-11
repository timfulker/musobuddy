/**
 * Monitor all webhook endpoints to see which one is actually receiving emails
 */

console.log('Monitoring all webhook endpoints...');
console.log('Please send an email to leads@musobuddy.com now');

// Test all webhook endpoints to see which one is accessible
const webhooks = [
  '/api/webhook/sendgrid',
  '/api/webhook/mailgun', 
  '/api/webhook/simple-email'
];

async function testWebhookEndpoints() {
  console.log('\n=== Testing Webhook Endpoint Accessibility ===');
  
  for (const webhook of webhooks) {
    const url = `https://musobuddy.replit.app${webhook}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'accessibility' })
      });
      
      console.log(`${webhook}: ${response.status} (${response.statusText})`);
    } catch (error) {
      console.log(`${webhook}: ERROR - ${error.message}`);
    }
  }
}

async function monitorEnquiries() {
  console.log('\n=== Starting Enquiry Monitoring ===');
  
  let lastCount = 0;
  
  // Get initial count
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries');
    if (response.ok) {
      const enquiries = await response.json();
      lastCount = enquiries.length;
      console.log(`Starting count: ${lastCount} enquiries`);
    }
  } catch (error) {
    console.log('Error getting initial count:', error.message);
  }
  
  // Monitor for changes
  const interval = setInterval(async () => {
    try {
      const response = await fetch('https://musobuddy.replit.app/api/enquiries');
      if (response.ok) {
        const enquiries = await response.json();
        if (enquiries.length > lastCount) {
          const newEnquiries = enquiries.slice(lastCount);
          console.log(`\n🎉 NEW ENQUIRY DETECTED!`);
          newEnquiries.forEach(enquiry => {
            console.log(`ID: ${enquiry.id}`);
            console.log(`Title: ${enquiry.title}`);
            console.log(`Client: ${enquiry.clientName}`);
            console.log(`Source: ${enquiry.source || 'Unknown'}`);
            console.log(`Notes: ${enquiry.notes?.substring(0, 100) || 'N/A'}`);
            console.log('---');
          });
          lastCount = enquiries.length;
        } else {
          console.log(`[${new Date().toLocaleTimeString()}] No new enquiries (${enquiries.length} total)`);
        }
      }
    } catch (error) {
      console.log(`Error monitoring: ${error.message}`);
    }
  }, 5000);
  
  // Stop monitoring after 2 minutes
  setTimeout(() => {
    clearInterval(interval);
    console.log('\nMonitoring stopped.');
  }, 120000);
}

// Run tests
testWebhookEndpoints().then(() => {
  monitorEnquiries();
});