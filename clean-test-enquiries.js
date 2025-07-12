/**
 * Clean up test enquiries to make room for real email test
 */

const { Pool } = require('pg');

async function cleanTestEnquiries() {
  console.log('🧹 Cleaning up test enquiries...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Delete all test enquiries (keep only real ones)
    const result = await pool.query(`
      DELETE FROM enquiries 
      WHERE 
        client_email LIKE '%test.com' 
        OR client_email LIKE '%@example.com' 
        OR client_email = 'unknown@email.com'
        OR subject LIKE '%test%'
        OR subject LIKE '%check%'
        OR subject LIKE '%counter%'
        OR subject LIKE '%monitor%'
        OR subject = 'No Subject'
        OR raw_email_data = '{}'
    `);
    
    console.log(`✅ Deleted ${result.rowCount} test enquiries`);
    
    // Show remaining enquiries
    const remaining = await pool.query(`
      SELECT id, subject, client_email, created_at 
      FROM enquiries 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Remaining enquiries:');
    remaining.rows.forEach(row => {
      console.log(`- ID ${row.id}: ${row.subject} from ${row.client_email}`);
    });
    
  } catch (error) {
    console.error('❌ Error cleaning enquiries:', error);
  } finally {
    await pool.end();
  }
}

cleanTestEnquiries();