// CRITICAL SESSION CLEANUP SCRIPT
// This clears all existing sessions to fix authentication issues

const { Pool } = require('pg');

async function clearOldSessions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    console.log('🧹 Clearing all old sessions to fix authentication...');
    
    const result = await pool.query('DELETE FROM sessions WHERE sid != $1', ['admin-session-keep']);
    console.log(`✅ Cleared ${result.rowCount} old sessions`);
    
    console.log('🔄 Sessions cleared. Users need to login again with fresh sessions.');
    
  } catch (error) {
    console.error('❌ Session cleanup error:', error);
  } finally {
    await pool.end();
  }
}

clearOldSessions();