import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
const initializeAnthropic = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is not set');
    throw new Error('Anthropic API key is not configured');
  }

  return new Anthropic({
    apiKey: apiKey
  });
};

export async function generateGigTypesForInstrument(instrument: string): Promise<string[]> {
  try {
    console.log(`🤖 Generating gig types for instrument: ${instrument}`);
    
    const anthropic = initializeAnthropic();
    
    const prompt = `Generate a comprehensive list of gig types that a professional musician who plays ${instrument} would typically perform. 

Consider all possible venues and event types where this instrument would be appropriate. Include traditional, modern, and creative opportunities.

For ${instrument}, please provide 15-25 specific gig type names that are:
1. Realistic and bookable gig types
2. Appropriate for the instrument
3. Specific enough to be useful (e.g., "Wedding Ceremony" not just "Wedding")
4. Varied across different venues and occasions

Return ONLY a JSON array of gig type names, no other text. Example format:
["Wedding Ceremony", "Corporate Event", "Jazz Club Performance", "Private Party"]`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: prompt
      }]
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    
    try {
      const gigTypes = JSON.parse(content);
      
      if (Array.isArray(gigTypes)) {
        console.log(`✅ Generated ${gigTypes.length} gig types for ${instrument}`);
        console.log(`🎵 Sample gig types: ${gigTypes.slice(0, 5).join(', ')}${gigTypes.length > 5 ? '...' : ''}`);
        return gigTypes;
      } else {
        console.warn('⚠️ AI response was not an array, falling back to manual parsing');
        // Try to extract array from response text
        const arrayMatch = content.match(/\[([^\]]+)\]/);
        if (arrayMatch) {
          const extracted = JSON.parse(arrayMatch[0]);
          return Array.isArray(extracted) ? extracted : [];
        }
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse AI response as JSON, attempting manual extraction');
      
      // Fallback: extract quoted strings
      const matches = content.match(/"([^"]+)"/g);
      if (matches) {
        const gigTypes = matches.map(match => match.replace(/"/g, ''));
        console.log(`✅ Extracted ${gigTypes.length} gig types from AI response`);
        return gigTypes;
      }
    }
    
    console.warn(`⚠️ Could not generate gig types for ${instrument}, returning empty array`);
    return [];
    
  } catch (error: any) {
    console.error(`❌ Failed to generate gig types for ${instrument}:`, error.message);
    
    // Return some fallback gig types based on instrument type
    const fallbackGigTypes = getFallbackGigTypes(instrument);
    console.log(`🔄 Using fallback gig types for ${instrument}: ${fallbackGigTypes.length} types`);
    return fallbackGigTypes;
  }
}

function getFallbackGigTypes(instrument: string): string[] {
  // Basic fallback gig types that work for most instruments
  const baseTypes = [
    "Wedding Ceremony",
    "Wedding Reception",
    "Corporate Event",
    "Private Party",
    "Birthday Party",
    "Anniversary Celebration",
    "Restaurant Performance",
    "Hotel Lounge Performance",
    "Funeral Service",
    "Festival Performance"
  ];
  
  // Add instrument-specific types
  if (instrument.includes('dj') || instrument.includes('DJ')) {
    return [
      ...baseTypes,
      "Club DJ",
      "Mobile Disco",
      "Party DJ",
      "Wedding DJ"
    ];
  }
  
  if (['saxophone', 'trumpet', 'trombone', 'clarinet'].includes(instrument)) {
    return [
      ...baseTypes,
      "Jazz Club Performance",
      "Brass Ensemble",
      "Concert Performance"
    ];
  }
  
  if (['violin', 'viola', 'cello', 'double-bass'].includes(instrument)) {
    return [
      ...baseTypes,
      "String Quartet",
      "Solo Performance",
      "Concert Performance",
      "Chamber Music"
    ];
  }
  
  return baseTypes;
}