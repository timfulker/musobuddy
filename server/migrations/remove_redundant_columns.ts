import { db } from "../core/database";

// Remove redundant columns from user_settings table
export async function removeRedundantColumns() {
  try {
    console.log('🗑️ Removing redundant columns from user_settings table...');
    
    const columnsToRemove = [
      'event_types',
      'instruments_played', 
      'custom_instruments',
      'default_terms'
    ];
    
    for (const column of columnsToRemove) {
      try {
        console.log(`  Removing column: ${column}`);
        await db.execute(`ALTER TABLE user_settings DROP COLUMN IF EXISTS ${column}`);
        console.log(`  ✅ Removed: ${column}`);
      } catch (error: any) {
        console.log(`  ⚠️ Column ${column} might not exist or has dependencies, skipping...`);
      }
    }
    
    console.log('✅ Successfully removed all redundant columns');
    
  } catch (error) {
    console.error('❌ Failed to remove redundant columns:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  removeRedundantColumns()
    .then(() => {
      console.log('🎉 Redundant column removal completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Redundant column removal failed:', error);
      process.exit(1);
    });
}