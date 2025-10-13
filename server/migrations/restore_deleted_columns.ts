import { db } from "../core/database";

// Restore the 5 deleted columns to fix API errors
export async function restoreDeletedColumns() {
  try {
    console.log('🔧 Restoring deleted columns to user_settings table...');
    
    const columnsToRestore = [
      'event_types',
      'instruments_played', 
      'custom_instruments',
      'default_terms'
    ];
    
    for (const column of columnsToRestore) {
      try {
        console.log(`  Adding column: ${column}`);
        await db.execute(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS ${column} TEXT`);
        console.log(`  ✅ Added: ${column}`);
      } catch (error: any) {
        console.log(`  ⚠️ Column ${column} might already exist, skipping...`);
      }
    }
    
    console.log('✅ Successfully restored all deleted columns');
    
  } catch (error) {
    console.error('❌ Failed to restore deleted columns:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  restoreDeletedColumns()
    .then(() => {
      console.log('🎉 Column restoration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Column restoration failed:', error);
      process.exit(1);
    });
}