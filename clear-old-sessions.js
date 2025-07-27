import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function clearSessions() {
  console.log('🧹 Clearing old sessions...');
  
  try {
    await client.connect();
    
    // Delete all sessions to force clean slate
    const result = await client.query('DELETE FROM sessions');
    console.log(`✅ Deleted ${result.rowCount} sessions`);
    
    // List remaining sessions
    const remaining = await client.query('SELECT * FROM sessions');
    console.log(`📊 Remaining sessions: ${remaining.rowCount}`);
    
  } catch (error) {
    console.error('❌ Session cleanup failed:', error);
  } finally {
    await client.end();
  }
}

clearSessions();