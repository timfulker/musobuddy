/**
 * Monitor ALL webhook activity to see if emails are reaching but failing
 */

const WEBHOOK_URL = 'https://musobuddy.replit.app/api/webhook/mailgun';

async function monitorWebhookActivity() {
  console.log('🔍 MONITORING WEBHOOK ACTIVITY');
  console.log('This will show if emails are reaching the webhook but failing during processing');
  
  // Check recent enquiries to see if any were created
  try {
    const response = await fetch('https://musobuddy.replit.app/api/enquiries', {
      headers: {
        'Cookie': 'connect.sid=s%3A_NKJPzDYvPPzO6SvWzJUqfOmZmQVrPOz.T3YJqtJbL4YuEiVQJIqLnCtKhJlG7qFUZE8ypLZSRjE'
      }
    });
    
    if (response.ok) {
      const enquiries = await response.json();
      console.log(`📋 Recent enquiries found: ${enquiries.length}`);
      
      // Show the last 5 enquiries
      const recent = enquiries.slice(-5);
      recent.forEach(enquiry => {
        console.log(`• #${enquiry.id}: ${enquiry.clientName} - ${enquiry.title} (${enquiry.status})`);
      });
      
      // Check for enquiries created in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentEnquiries = enquiries.filter(enquiry => 
        new Date(enquiry.createdAt) > oneHourAgo
      );
      
      if (recentEnquiries.length > 0) {
        console.log('\n🔥 RECENT ENQUIRIES (last hour):');
        recentEnquiries.forEach(enquiry => {
          console.log(`• #${enquiry.id}: ${enquiry.clientName} - ${enquiry.title}`);
          console.log(`  Created: ${new Date(enquiry.createdAt).toLocaleString()}`);
        });
      } else {
        console.log('\n❌ NO RECENT ENQUIRIES FOUND');
        console.log('This suggests emails either:');
        console.log('1. Are not reaching the webhook at all');
        console.log('2. Are reaching but failing during processing');
        console.log('3. Are being processed but not creating enquiries');
      }
      
    } else {
      console.log('❌ Failed to fetch enquiries:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Error fetching enquiries:', error.message);
  }
  
  console.log('\n🔧 DEBUGGING STEPS:');
  console.log('1. Check if your real emails are reaching the webhook');
  console.log('2. Verify Mailgun route is pointing to correct URL');
  console.log('3. Check if email format from Mailgun differs from test data');
  console.log('4. Verify webhook processing doesn\'t fail on real email data');
  
  console.log('\n📧 NEXT: Send a test email to leads@musobuddy.com and check logs');
}

monitorWebhookActivity();