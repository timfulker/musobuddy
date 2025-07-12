/**
 * Check if the Mailgun route test created a new enquiry
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkRouteTest() {
  try {
    // Check for recent enquiries (last 10 minutes)
    const recentEnquiries = await pool.query(`
      SELECT id, client_name, client_email, event_type, event_date, message, created_at
      FROM enquiries 
      WHERE created_at > NOW() - INTERVAL '10 minutes'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n🔍 Recent enquiries (last 10 minutes):');
    if (recentEnquiries.rows.length === 0) {
      console.log('No recent enquiries found');
    } else {
      recentEnquiries.rows.forEach(enquiry => {
        console.log(`- Enquiry #${enquiry.id}: ${enquiry.client_name} (${enquiry.client_email}) - ${enquiry.event_type} - ${enquiry.created_at}`);
      });
    }

    // Check total enquiry count
    const totalEnquiries = await pool.query('SELECT COUNT(*) FROM enquiries');
    console.log(`\n📊 Total enquiries: ${totalEnquiries.rows[0].count}`);

    // Check if route test was processed
    const testEnquiry = await pool.query(`
      SELECT * FROM enquiries 
      WHERE message LIKE '%test%' OR client_email LIKE '%test%'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (testEnquiry.rows.length > 0) {
      console.log('\n✅ Route test enquiry found:');
      console.log(testEnquiry.rows[0]);
    } else {
      console.log('\n⚠️ No test enquiry found - route test may not have triggered webhook');
    }

  } catch (error) {
    console.error('Error checking route test:', error);
  } finally {
    await pool.end();
  }
}

checkRouteTest();