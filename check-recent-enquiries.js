/**
 * Check for new enquiries created from email forwarding
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function checkForNewEnquiries() {
  try {
    console.log('🔍 Checking for recent enquiries...\n');
    
    // Get the latest enquiries
    const enquiries = await sql`
      SELECT id, title, client_name, client_email, created_at, notes
      FROM enquiries
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log(`Found ${enquiries.length} recent enquiries:\n`);
    
    enquiries.forEach((enquiry, index) => {
      const createdAt = new Date(enquiry.created_at);
      const timeAgo = Math.round((Date.now() - createdAt.getTime()) / 60000); // minutes ago
      
      console.log(`${index + 1}. ID: ${enquiry.id}`);
      console.log(`   Title: ${enquiry.title}`);
      console.log(`   Client: ${enquiry.client_name} (${enquiry.client_email})`);
      console.log(`   Created: ${createdAt.toLocaleString()} (${timeAgo} min ago)`);
      console.log(`   Notes: ${enquiry.notes?.substring(0, 100)}...`);
      console.log('---');
    });
    
    // Check for any enquiries created in the last 5 minutes
    const recentEnquiries = enquiries.filter(e => {
      const createdAt = new Date(e.created_at);
      const minutesAgo = (Date.now() - createdAt.getTime()) / 60000;
      return minutesAgo <= 5;
    });
    
    if (recentEnquiries.length > 0) {
      console.log(`\n✅ Found ${recentEnquiries.length} enquiries created in the last 5 minutes!`);
      console.log('Email forwarding is working correctly! 🎉');
    } else {
      console.log('\n⏰ No enquiries created in the last 5 minutes.');
      console.log('This might mean:');
      console.log('- Email is still being processed by SendGrid');
      console.log('- Webhook update may still be propagating');
      console.log('- Email was not sent to leads@musobuddy.com');
    }
    
  } catch (error) {
    console.error('Error checking enquiries:', error);
  }
}

// Run the check
checkForNewEnquiries();