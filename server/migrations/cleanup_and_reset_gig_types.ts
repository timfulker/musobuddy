import { db } from "../core/database";
import { sql } from "drizzle-orm";
import { getGigTypeNamesForInstrument } from "../../shared/instrument-gig-presets";

// Migration to remove unnecessary fields and reset gig types properly
export async function cleanupAndResetGigTypes() {
  try {
    console.log('🧹 Starting cleanup and reset of gig types...');
    
    // First, let's regenerate gig_types for all users based on their instruments
    console.log('📊 Regenerating gig types from instruments...');
    
    const result = await db.execute(`
      SELECT user_id, primary_instrument, secondary_instruments 
      FROM user_settings 
      WHERE user_id IS NOT NULL
    `);
    
    for (const row of result.rows) {
      const userId = row.user_id as string;
      const primaryInstrument = row.primary_instrument as string || "";
      let secondaryInstruments: string[] = [];
      
      // Parse secondary instruments
      if (row.secondary_instruments) {
        try {
          if (typeof row.secondary_instruments === 'string') {
            secondaryInstruments = JSON.parse(row.secondary_instruments as string);
          } else if (Array.isArray(row.secondary_instruments)) {
            secondaryInstruments = row.secondary_instruments as string[];
          }
        } catch (e) {
          console.warn(`Failed to parse secondary instruments for user ${userId}`);
        }
      }
      
      // Get all instruments
      const allInstruments = [primaryInstrument, ...secondaryInstruments].filter(Boolean);
      
      // Generate gig types from instruments
      const instrumentGigTypes = allInstruments.reduce((acc, instrument) => {
        const gigTypes = getGigTypeNamesForInstrument(instrument);
        return [...acc, ...gigTypes];
      }, [] as string[]);
      
      // Remove duplicates and sort
      const uniqueGigTypes = [...new Set(instrumentGigTypes)].sort();
      
      console.log(`User ${userId}:`);
      console.log(`  Instruments: ${allInstruments.join(', ') || 'none'}`);
      console.log(`  Generated ${uniqueGigTypes.length} gig types`);
      if (uniqueGigTypes.length > 0) {
        console.log(`  Sample: ${uniqueGigTypes.slice(0, 3).join(', ')}${uniqueGigTypes.length > 3 ? '...' : ''}`);
      }
      
      // Update gig_types with AI-generated values and clear custom_gig_types
      await db.execute(
        sql`UPDATE user_settings 
            SET gig_types = ${JSON.stringify(uniqueGigTypes)}, 
                custom_gig_types = '[]' 
            WHERE user_id = ${userId}`
      );
    }
    
    console.log('✅ Gig types regenerated successfully');
    
    // Now remove the unnecessary columns
    console.log('🗑️ Removing unnecessary columns...');
    
    const columnsToRemove = [
      'event_types',
      'instruments_played',
      'custom_instruments'
    ];
    
    for (const column of columnsToRemove) {
      try {
        console.log(`  Removing column: ${column}`);
        await db.execute(`
          ALTER TABLE user_settings 
          DROP COLUMN IF EXISTS ${column};
        `);
      } catch (error) {
        console.log(`  Column ${column} might not exist, skipping...`);
      }
    }
    
    console.log('✅ Successfully cleaned up database and reset gig types');
    
  } catch (error) {
    console.error('❌ Failed to cleanup and reset:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupAndResetGigTypes()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}