import OpenAI from "openai";
import { storage } from "./storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_INSTRUMENT_MAPPING_KEY || process.env.OPENAI_API_KEY
});

export interface InstrumentMapping {
  instrument: string;
  category: 'band' | 'strings' | 'woodwind' | 'brass' | 'percussion' | 'keyboards' | 'vocals' | 'electronic' | 'custom';
  gigTypes: string[];
  isCustom?: boolean;
}

export async function categorizeInstrument(instrument: string): Promise<InstrumentMapping> {
  const instrumentKey = instrument.toLowerCase();
  
  try {
    // First check system-wide cache for existing mapping
    const existingMapping = await storage.getInstrumentMapping(instrumentKey);
    if (existingMapping) {
      return {
        instrument: instrumentKey,
        category: existingMapping.category as any,
        gigTypes: JSON.parse(existingMapping.gigTypes),
        isCustom: existingMapping.isCustom || false
      };
    }
    
    // If not cached, call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert in musical instruments and performance contexts. Your task is to categorize musical instruments and suggest relevant gig types.

Categories available:
- band: Traditional band instruments (guitar, bass, drums, etc.)
- strings: Violin, cello, viola, harp, etc.
- woodwind: Saxophone, clarinet, flute, oboe, etc.
- brass: Trumpet, trombone, horn, tuba, etc.
- percussion: Drums, timpani, vibraphone, etc.
- keyboards: Piano, keyboard, organ, etc.
- vocals: Singer, vocalist, choir, etc.
- electronic: DJ equipment, synthesizers, electronic instruments
- custom: If the instrument doesn't fit standard categories

For each instrument, also suggest 5-8 relevant gig types where that instrument would typically be hired. Examples: Wedding, Corporate Event, Jazz Club, Restaurant, Birthday Party, Christmas Party, Cocktail Reception, etc.

Respond in JSON format with this structure:
{
  "instrument": "instrument_name",
  "category": "category_name",
  "gigTypes": ["gig_type_1", "gig_type_2", ...],
  "isCustom": false
}

If the instrument is very unusual or you're unsure of the category, use "custom" and set isCustom to true.`
        },
        {
          role: "user",
          content: `Categorize this instrument: ${instrument}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content!);
    
    const mapping: InstrumentMapping = {
      instrument: instrumentKey,
      category: result.category,
      gigTypes: result.gigTypes,
      isCustom: result.isCustom || false
    };
    
    // Cache the result system-wide for all future users
    await storage.saveInstrumentMapping({
      instrument: instrumentKey,
      category: mapping.category,
      gigTypes: JSON.stringify(mapping.gigTypes),
      isCustom: mapping.isCustom
    });
    
    return mapping;
  } catch (error) {
    console.error('Error categorizing instrument:', error);
    
    // Fallback to custom category if API fails
    return {
      instrument: instrumentKey,
      category: 'custom',
      gigTypes: ['Wedding', 'Corporate Event', 'Private Party', 'Restaurant', 'Birthday Party'],
      isCustom: true
    };
  }
}

export async function generateGigTypesForInstruments(instruments: string[]): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert in musical performance booking. Based on a list of instruments a musician plays, suggest relevant gig types where they would typically be hired.

Consider the combination of instruments to suggest gig types that would utilize multiple instruments or the unique combination.

Respond in JSON format with this structure:
{
  "gigTypes": ["gig_type_1", "gig_type_2", ...]
}

Provide 8-12 diverse gig types that would be most relevant for someone who plays this combination of instruments.`
        },
        {
          role: "user",
          content: `Generate relevant gig types for a musician who plays: ${instruments.join(', ')}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const result = JSON.parse(response.choices[0].message.content!);
    return result.gigTypes;
  } catch (error) {
    console.error('Error generating gig types:', error);
    
    // Fallback to standard gig types
    return ['Wedding', 'Corporate Event', 'Private Party', 'Restaurant', 'Birthday Party', 'Jazz Club', 'Cocktail Reception', 'Christmas Party'];
  }
}