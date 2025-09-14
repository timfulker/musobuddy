// Check what data exists in Neon database that needs to be ported
import pg from 'pg';
const { Pool } = pg;

// Neon database connection
const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_leuHwm5rSOa7@ep-jolly-glitter-ae3liidk.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require'
});

async function checkNeonData() {
  console.log('🔍 CHECKING DATA IN NEON DATABASE');
  console.log('='.repeat(60));

  const tablesToCheck = [
    'booking_documents', 'client_communications', 'compliance_documents',
    'user_activity', 'user_audit_logs', 'user_login_history', 'user_messages',
    'support_tickets', 'unparseable_messages', 'fraud_prevention_log',
    'security_monitoring', 'phone_verifications', 'sms_verifications',
    'beta_invites', 'beta_invite_codes', 'blocked_dates', 'booking_conflicts'
  ];

  for (const table of tablesToCheck) {
    try {
      const result = await neonPool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = parseInt(result.rows[0].count);

      if (count > 0) {
        console.log(`✅ ${table}: ${count} records`);

        // Show sample data for non-empty tables
        const sample = await neonPool.query(`SELECT * FROM ${table} LIMIT 2`);
        if (sample.rows.length > 0) {
          const columns = Object.keys(sample.rows[0]);
          console.log(`   📋 Columns: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);
        }
      } else {
        console.log(`⭕ ${table}: Empty`);
      }
    } catch (error) {
      console.log(`❌ ${table}: Error - ${error.message}`);
    }
  }

  await neonPool.end();
}

checkNeonData().catch(console.error);