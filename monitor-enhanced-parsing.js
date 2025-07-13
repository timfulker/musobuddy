/**
 * Monitor for new enquiries to verify enhanced email parsing is working
 */

import { Pool } from '@neondatabase/serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkLatestEnquiries() {
  try {
    const result = await pool.query(`
      SELECT id, client_name, client_email, client_phone, notes, created_at, venue, event_type, gig_type
      FROM enquiries 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log('📧 LATEST 5 ENQUIRIES:');
    console.log('');
    
    result.rows.forEach(enquiry => {
      console.log(`🔍 ENQUIRY #${enquiry.id}:`);
      console.log(`   Client Name: ${enquiry.client_name}`);
      console.log(`   Client Email: ${enquiry.client_email}`);
      console.log(`   Phone: ${enquiry.client_phone || 'Not extracted'}`);
      console.log(`   Venue: ${enquiry.venue || 'Not extracted'}`);
      console.log(`   Event Type: ${enquiry.event_type || 'Not extracted'}`);
      console.log(`   Gig Type: ${enquiry.gig_type || 'Not extracted'}`);
      console.log(`   Created: ${enquiry.created_at}`);
      console.log(`   Notes: ${enquiry.notes ? enquiry.notes.substring(0, 100) + '...' : 'No notes'}`);
      console.log('');
      
      // Check for enhanced parsing success
      if (enquiry.client_name && 
          enquiry.client_name !== 'unknown' && 
          enquiry.client_name !== 'Unknown Client' &&
          enquiry.client_email &&
          enquiry.client_email !== 'unknown@example.com') {
        console.log('✅ Enhanced parsing working for this enquiry');
      } else {
        console.log('❌ Still using fallback values');
      }
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error checking enquiries:', error.message);
  } finally {
    await pool.end();
  }
}

console.log('🎯 MONITORING ENHANCED EMAIL PARSING');
console.log('Checking latest enquiries to verify parsing improvements...');
console.log('');

checkLatestEnquiries();