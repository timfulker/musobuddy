import { db } from "../core/database";
import { getGigTypeNamesForInstrument } from "../../shared/instrument-gig-presets";

// Migration to reset gig types and regenerate from instruments
export async function resetGigTypes() {
  try {
    console.log('🔄 Resetting gig types for all users...');
    
    // Get all users' settings
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
      
      console.log(`User ${userId}: ${allInstruments.length} instruments → ${uniqueGigTypes.length} gig types`);
      console.log(`  Instruments: ${allInstruments.join(', ')}`);
      console.log(`  First 5 gig types: ${uniqueGigTypes.slice(0, 5).join(', ')}${uniqueGigTypes.length > 5 ? '...' : ''}`);
      
      // Update the database: 
      // - gig_types = AI-generated from instruments
      // - custom_gig_types = empty (user will add their own)
      await db.execute(`
        UPDATE user_settings 
        SET 
          gig_types = $1,
          custom_gig_types = '[]'
        WHERE user_id = $2
      `, [JSON.stringify(uniqueGigTypes), userId]);
    }
    
    console.log('✅ Successfully reset gig types for all users');
    
  } catch (error) {
    console.error('❌ Failed to reset gig types:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetGigTypes()
    .then(() => {
      console.log('🎵 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}