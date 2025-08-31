import { db } from "../core/database";

// Migration to add gigTypes column to userSettings table
export async function addGigTypesColumn() {
  try {
    console.log('🔄 Adding gigTypes column to user_settings table...');
    
    // Add the new gigTypes column
    await db.execute(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS gig_types TEXT;
    `);
    
    console.log('✅ Successfully added gigTypes column to user_settings table');
    
  } catch (error) {
    console.error('❌ Failed to add gigTypes column:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addGigTypesColumn()
    .then(() => {
      console.log('🎵 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}