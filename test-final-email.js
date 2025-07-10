/**
 * Monitor for new enquiries from email forwarding test
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function checkForNewEnquiries() {
  console.log('=== CHECKING FOR NEW ENQUIRIES ===');
  
  try {
    // Get the 5 most recent enquiries
    const enquiries = await sql`
      SELECT id, title, client_name, client_email, event_date, event_type, notes, created_at
      FROM enquiries 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    console.log(`Found ${enquiries.length} recent enquiries:`);
    
    enquiries.forEach((enquiry, index) => {
      console.log(`\n${index + 1}. Enquiry #${enquiry.id}`);
      console.log(`   Title: ${enquiry.title}`);
      console.log(`   Client: ${enquiry.client_name}`);
      console.log(`   Email: ${enquiry.client_email}`);
      console.log(`   Event: ${enquiry.event_type} on ${enquiry.event_date}`);
      console.log(`   Notes: ${enquiry.notes?.substring(0, 100)}...`);
      console.log(`   Created: ${enquiry.created_at}`);
    });
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Send a test email to leads@musobuddy.com');
    console.log('2. Check your MusoBuddy enquiries page');
    console.log('3. Run this script again to see new enquiries');
    
  } catch (error) {
    console.error('Error checking enquiries:', error);
  }
}

checkForNewEnquiries();