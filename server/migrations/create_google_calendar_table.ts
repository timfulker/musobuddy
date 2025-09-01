import { db } from '../core/database.js';
import { sql } from 'drizzle-orm';

async function createGoogleCalendarTable() {
  console.log('🔧 Creating Google Calendar integration table...');
  
  try {
    // Create the table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "google_calendar_integration" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "user_id" VARCHAR NOT NULL UNIQUE,
        "google_refresh_token" TEXT NOT NULL,
        "google_calendar_id" VARCHAR DEFAULT 'primary',
        "sync_enabled" BOOLEAN DEFAULT true,
        "last_sync_at" TIMESTAMP,
        "sync_token" TEXT,
        "webhook_channel_id" VARCHAR,
        "webhook_expiration" TIMESTAMP,
        "auto_sync_bookings" BOOLEAN DEFAULT true,
        "auto_import_events" BOOLEAN DEFAULT false,
        "sync_direction" VARCHAR DEFAULT 'bidirectional',
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Google Calendar integration table created successfully');
    
    // Check if table exists and is accessible
    const result = await db.execute(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='google_calendar_integration'`);
    console.log('📊 Table verification:', result.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');
    
  } catch (error) {
    console.error('❌ Failed to create Google Calendar table:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createGoogleCalendarTable()
    .then(() => {
      console.log('✅ Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { createGoogleCalendarTable };