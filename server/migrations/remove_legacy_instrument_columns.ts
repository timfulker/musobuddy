import { db } from "../core/database";

// Migration to remove unused legacy columns from userSettings table
export async function removeLegacyInstrumentColumns() {
  try {
    console.log('🧹 Removing legacy instrument columns from user_settings table...');
    
    // Remove the unused legacy columns
    const columnsToRemove = [
      'instruments_played',
      'custom_instruments', 
      'event_types'
    ];
    
    for (const column of columnsToRemove) {
      console.log(`🗑️ Removing column: ${column}`);
      await db.execute(`
        ALTER TABLE user_settings 
        DROP COLUMN IF EXISTS ${column};
      `);
    }
    
    console.log('✅ Successfully removed legacy instrument columns from user_settings table');
    
  } catch (error) {
    console.error('❌ Failed to remove legacy columns:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  removeLegacyInstrumentColumns()
    .then(() => {
      console.log('🧹 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}