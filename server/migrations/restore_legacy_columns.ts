import { db } from "../core/database";

// Migration to restore legacy columns temporarily to fix the app
export async function restoreLegacyColumns() {
  try {
    console.log('🔄 Restoring legacy columns to user_settings table...');
    
    // Restore the legacy columns
    await db.execute(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS event_types TEXT,
      ADD COLUMN IF NOT EXISTS instruments_played TEXT,
      ADD COLUMN IF NOT EXISTS custom_instruments TEXT;
    `);
    
    console.log('✅ Successfully restored legacy columns to user_settings table');
    
  } catch (error) {
    console.error('❌ Failed to restore legacy columns:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  restoreLegacyColumns()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}