import { db } from "../core/database";
import { sql } from "drizzle-orm";
import { OpenAI } from "openai";

// Migration to properly call AI and generate correct number of gig types
export async function fixAIGigGeneration() {
  try {
    console.log('🤖 Fixing AI gig type generation...');
    
    // Initialize OpenAI
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY not found');
      return;
    }

    const openai = new OpenAI({ apiKey });

    // Get users with instruments
    const result = await db.execute(`
      SELECT user_id, primary_instrument, secondary_instruments 
      FROM user_settings 
      WHERE user_id IS NOT NULL 
      AND (primary_instrument IS NOT NULL OR secondary_instruments IS NOT NULL)
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
      
      const allInstruments = [primaryInstrument, ...secondaryInstruments].filter(Boolean);
      
      if (allInstruments.length === 0) {
        console.log(`User ${userId}: No instruments, skipping`);
        continue;
      }
      
      console.log(`User ${userId}: Generating AI gig types for ${allInstruments.join(', ')}`);
      
      // Generate gig types using AI for each instrument
      const allGigTypes = [];
      
      for (const instrument of allInstruments) {
        try {
          console.log(`  🎵 Generating gig types for ${instrument}...`);
          
          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            max_tokens: 1200,
            temperature: 0.7,
            messages: [{
              role: "user", 
              content: `Generate a comprehensive list of 20-25 specific gig types that a professional musician who plays ${instrument} would typically perform.

Include various venues, event types, and performance contexts. Be very specific (e.g., "Wedding Reception" not just "Wedding", "Corporate Networking Event" not just "Corporate").

Consider all these contexts:
- Weddings (ceremony, drinks reception, evening party)  
- Corporate events (launches, awards, networking, staff parties)
- Private celebrations (birthdays, anniversaries, engagement parties)
- Venues (restaurants, hotels, bars, clubs, festivals)
- Special occasions (Christmas, New Year, graduation balls)
- Professional contexts (recording sessions, cruise ships, fashion shows)

Return ONLY a JSON array of specific gig type names:
["Wedding Reception", "Corporate Networking Event", "Birthday Party"]`
            }]
          });

          const content = response.choices[0]?.message?.content || '';
          
          try {
            const gigTypes = JSON.parse(content.trim());
            if (Array.isArray(gigTypes) && gigTypes.length > 0) {
              console.log(`    ✅ Generated ${gigTypes.length} gig types for ${instrument}`);
              allGigTypes.push(...gigTypes);
            } else {
              console.warn(`    ⚠️ Invalid response for ${instrument}`);
            }
          } catch (parseError) {
            console.warn(`    ⚠️ Failed to parse AI response for ${instrument}`);
          }
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error: any) {
          console.error(`    ❌ AI generation failed for ${instrument}:`, error.message);
        }
      }
      
      // Remove duplicates and sort
      const uniqueGigTypes = [...new Set(allGigTypes)].sort();
      
      console.log(`  📊 Total: ${uniqueGigTypes.length} unique gig types`);
      console.log(`  🎭 Sample: ${uniqueGigTypes.slice(0, 5).join(', ')}${uniqueGigTypes.length > 5 ? '...' : ''}`);
      
      // Update database with AI-generated gig types
      await db.execute(
        sql`UPDATE user_settings 
            SET gig_types = ${JSON.stringify(uniqueGigTypes)}
            WHERE user_id = ${userId}`
      );
    }
    
    console.log('✅ Successfully fixed AI gig type generation');
    
  } catch (error) {
    console.error('❌ Failed to fix AI gig generation:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixAIGigGeneration()
    .then(() => {
      console.log('🎉 AI gig type fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ AI gig type fix failed:', error);
      process.exit(1);
    });
}