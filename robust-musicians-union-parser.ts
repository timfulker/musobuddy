/**
 * ROBUST MUSICIANS UNION PARSER
 * 
 * This parser is designed to work consistently across ALL Musicians Union L2 contracts
 * without overfitting to specific contracts. It uses pattern recognition rather than
 * contract-specific fixes.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ParsedContract {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  venue?: string;
  venueAddress?: string;
  eventDate?: string;
  eventTime?: string;
  eventEndTime?: string;
  fee?: number;
  equipmentRequirements?: string;
  specialRequirements?: string;
  eventType?: string;
}

export async function parseMusiciansUnionContract(contractText: string): Promise<ParsedContract> {
  console.log('🎵 ROBUST MUSICIANS UNION PARSER - Starting Analysis');
  
  // Build a robust prompt that works for ALL Musicians Union contracts
  const prompt = `
You are parsing a Musicians' Union L2 Contract for Hiring a Solo Musician. 

CRITICAL PARSING RULES:
1. The MUSICIAN is Tim Fulker - NEVER extract his details as client information
2. The CLIENT/HIRER is the person hiring Tim Fulker - extract THEIR details
3. Look for standard Musicians Union contract sections and field patterns
4. Return ONLY valid JSON with the specified field names

CONTRACT TEXT:
${contractText}

FIELD MAPPING INSTRUCTIONS:
- clientName: Extract the hirer's name (NOT Tim Fulker)
- clientEmail: Extract the hirer's email address
- clientPhone: Extract the hirer's phone number
- clientAddress: Extract the hirer's address (NOT 59 Gloucester Rd)
- venue: Extract performance venue name
- venueAddress: Extract venue address
- eventDate: Extract performance date (YYYY-MM-DD format)
- eventTime: Extract start time (HH:MM format)
- eventEndTime: Extract end time (HH:MM format)  
- fee: Extract total fee as number (remove £ symbol)
- equipmentRequirements: Extract equipment/technical requirements
- specialRequirements: Extract special instructions or requirements
- eventType: Extract event type (wedding, corporate, etc.)

VALIDATION RULES:
- If clientName contains "Tim Fulker" or similar, that's WRONG - find the actual hirer
- If clientAddress contains "59 Gloucester" or "BH7 6JA", that's WRONG - find the hirer's address
- If clientEmail contains "timfulker" or "saxdj", that's WRONG - find the hirer's email
- Look for patterns like "between [Company/Person] and Tim Fulker" - extract the first part
- Standard MU contract has "Name (please print)" sections - extract the NON-musician name

Return only valid JSON with the extracted data:
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      temperature: 0.1, // Low temperature for consistent parsing
      system: "You are a specialized Musicians Union contract parser. Extract client information accurately. Return only valid JSON.",
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid AI response type');
    }

    console.log('🤖 Raw AI Response:', content.text);

    // Extract JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    console.log('📋 Extracted Data:', extractedData);

    // Apply robust validation - block Tim's details being used as client
    const validatedData: ParsedContract = {};

    // Validate client name
    if (extractedData.clientName) {
      const name = extractedData.clientName.trim().toLowerCase();
      if (!name.includes('tim fulker') && !name.includes('fulker') && name !== 'tim') {
        validatedData.clientName = extractedData.clientName.trim();
        console.log('✅ Valid client name:', validatedData.clientName);
      } else {
        console.warn('❌ Blocked Tim Fulker as client name');
      }
    }

    // Validate client email
    if (extractedData.clientEmail) {
      const email = extractedData.clientEmail.trim().toLowerCase();
      if (!email.includes('timfulker') && !email.includes('saxdj')) {
        validatedData.clientEmail = extractedData.clientEmail.trim();
        console.log('✅ Valid client email:', validatedData.clientEmail);
      } else {
        console.warn('❌ Blocked Tim Fulker email as client email');
      }
    }

    // Validate client address
    if (extractedData.clientAddress) {
      const address = extractedData.clientAddress.trim().toLowerCase();
      if (!address.includes('59') || !address.includes('gloucester') || !address.includes('bh7')) {
        validatedData.clientAddress = extractedData.clientAddress.trim();
        console.log('✅ Valid client address:', validatedData.clientAddress);
      } else {
        console.warn('❌ Blocked Tim Fulker address as client address');
      }
    }

    // Validate phone (allow any phone that's not Tim's)
    if (extractedData.clientPhone) {
      const phone = extractedData.clientPhone.trim();
      if (phone !== '07764190034') {
        validatedData.clientPhone = phone;
        console.log('✅ Valid client phone:', validatedData.clientPhone);
      } else {
        console.warn('❌ Blocked Tim Fulker phone as client phone');
      }
    }

    // Copy other fields with basic validation
    ['venue', 'venueAddress', 'eventDate', 'eventTime', 'eventEndTime', 'equipmentRequirements', 'specialRequirements', 'eventType'].forEach(field => {
      if (extractedData[field] && typeof extractedData[field] === 'string') {
        const value = extractedData[field].trim();
        if (value && value !== 'null' && value !== 'N/A' && value !== 'Not specified') {
          (validatedData as any)[field] = value;
          console.log(`✅ Valid ${field}:`, value);
        }
      }
    });

    // Handle fee
    if (extractedData.fee) {
      const fee = typeof extractedData.fee === 'number' ? extractedData.fee : parseFloat(extractedData.fee);
      if (!isNaN(fee) && fee > 0) {
        validatedData.fee = fee;
        console.log('✅ Valid fee:', validatedData.fee);
      }
    }

    console.log('🎯 Final Validated Data:', validatedData);
    return validatedData;

  } catch (error) {
    console.error('❌ Parsing failed:', error);
    throw error;
  }
}