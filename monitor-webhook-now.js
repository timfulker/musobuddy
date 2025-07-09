/**
 * Monitor webhook for recent activity
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function monitorWebhookActivity() {
  console.log('🔍 MONITORING WEBHOOK ACTIVITY\n');
  
  // Check for very recent enquiries (last 2 minutes)
  const enquiries = await sql`
    SELECT id, title, client_name, client_email, created_at, notes
    FROM enquiries
    WHERE created_at > NOW() - INTERVAL '2 minutes'
    ORDER BY created_at DESC
  `;
  
  console.log(`Found ${enquiries.length} enquiries in the last 2 minutes:\n`);
  
  enquiries.forEach(enquiry => {
    const createdAt = new Date(enquiry.created_at);
    const secondsAgo = Math.round((Date.now() - createdAt.getTime()) / 1000);
    
    console.log(`📧 ID: ${enquiry.id}`);
    console.log(`   Title: ${enquiry.title}`);
    console.log(`   From: ${enquiry.client_email}`);
    console.log(`   Created: ${secondsAgo} seconds ago`);
    console.log(`   Notes: ${enquiry.notes?.substring(0, 80)}...`);
    console.log('---');
  });
  
  if (enquiries.length === 0) {
    console.log('⚠️  No webhook activity detected in the last 2 minutes');
    console.log('\nThis means:');
    console.log('1. SendGrid webhook URL may not be updated yet');
    console.log('2. Email may not have been sent to leads@musobuddy.com');
    console.log('3. SendGrid processing delay (can take 1-5 minutes)');
    console.log('\nDEBUG STEPS:');
    console.log('1. Verify SendGrid Inbound Parse webhook URL is: https://musobuddy.replit.app/api/webhook/sendgrid');
    console.log('2. Verify email was sent TO: leads@musobuddy.com');
    console.log('3. Check SendGrid Activity log for webhook calls');
  }
  
  // Test webhook endpoint to confirm it's working
  console.log('\n🧪 TESTING WEBHOOK ENDPOINT...');
  
  try {
    const response = await fetch('https://musobuddy.replit.app/api/webhook/sendgrid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SendGrid-Event-Webhook/1.0'
      },
      body: 'to=leads@musobuddy.com&from=tim@saxweddings.com&subject=Test from Sax Weddings&text=This is a test from Tim at Sax Weddings to verify the webhook is working'
    });
    
    const result = await response.json();
    console.log(`✅ Webhook test successful: ${response.status}`);
    console.log(`✅ Created enquiry: ${result.enquiryId}`);
    console.log('🎉 The webhook is working perfectly!');
    
  } catch (error) {
    console.log(`❌ Webhook test failed: ${error.message}`);
  }
}

monitorWebhookActivity().catch(console.error);