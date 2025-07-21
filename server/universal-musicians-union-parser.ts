/**
 * UNIVERSAL MUSICIANS UNION CONTRACT PARSER
 * 
 * This parser works consistently across ALL Musicians Union L2 contracts
 * by understanding the standard contract structure, not specific content.
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ContractData {
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

export async function parseUniversalMusiciansUnion(contractText: string): Promise<ContractData> {
  console.log('🎵 UNIVERSAL MUSICIANS UNION PARSER - Starting');
  console.log('📄 Contract text length:', contractText.length);
  
  // Build a universal prompt that works for ALL Musicians Union contracts
  const universalPrompt = `
You are parsing a Musicians' Union L2 Contract. These contracts have a STANDARD STRUCTURE that is IDENTICAL across all contracts.

CONTRACT STRUCTURE KNOWLEDGE:
- Page 1: Main contract with "between [CLIENT]" and "and [MUSICIAN]" clauses
- Page 2: Signature sections with "Signed by the Hirer" and "Signed by the Musician"
- Tim Fulker is ALWAYS the musician - NEVER extract his details as client info
- Form fields contain the actual filled-in data (marked as FORM_FIELD in the text)

EXTRACTION RULES:
1. CLIENT NAME: Look for FORM_FIELD values that are NOT "Tim Fulker" or "timfulkermusic@gmail.com"
2. CLIENT CONTACT: Extract from form fields that appear in hirer sections, NOT musician sections
3. VENUE: Extract performance location from engagement clause
4. TIMES: Look for Start Time and Finish Time in the contract table
5. FEE: Extract from Fee column, remove £ symbol
6. DATE: Convert any date format to YYYY-MM-DD

CRITICAL VALIDATION:
- If clientName is "Tim Fulker" -> WRONG, find the actual hirer
- If clientEmail contains "timfulker" or "saxdj" -> WRONG, find hirer's email
- If clientAddress contains "59 Gloucester" or "BH7 6JA" -> WRONG, find hirer's address

CONTRACT TEXT (including form fields):
${contractText}

Extract the data and return ONLY valid JSON:
`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      temperature: 0.1,
      system: "You are a specialized Musicians Union contract parser. Extract only the HIRER's information, never the musician's. Return only valid JSON.",
      messages: [{ role: 'user', content: universalPrompt }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Invalid AI response type');
    }

    console.log('🤖 AI Response:', content.text);

    // Extract JSON
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    console.log('📋 Raw extracted data:', extractedData);

    // Apply UNIVERSAL validation that works for ANY contract
    const validatedData: ContractData = {};

    // Universal client name validation - block only Tim Fulker specifically
    if (extractedData.clientName) {
      const name = extractedData.clientName.trim();
      const nameLower = name.toLowerCase();
      if (nameLower !== 'tim fulker' && !nameLower.includes('timfulker') && name !== 'Tim') {
        validatedData.clientName = name;
        console.log('✅ Valid client name:', name);
      } else {
        console.warn('❌ Blocked Tim Fulker as client name:', name);
      }
    }

    // Universal email validation
    if (extractedData.clientEmail) {
      const email = extractedData.clientEmail.trim().toLowerCase();
      if (!email.includes('timfulker') && !email.includes('saxdj')) {
        validatedData.clientEmail = extractedData.clientEmail.trim();
        console.log('✅ Valid client email:', validatedData.clientEmail);
      } else {
        console.warn('❌ Blocked Tim email as client email:', extractedData.clientEmail);
      }
    }

    // Universal phone validation
    if (extractedData.clientPhone) {
      const phone = extractedData.clientPhone.trim();
      if (phone !== '07764190034') { // Tim's phone
        validatedData.clientPhone = phone;
        console.log('✅ Valid client phone:', phone);
      } else {
        console.warn('❌ Blocked Tim phone as client phone');
      }
    }

    // Universal address validation - only block Tim's specific address
    if (extractedData.clientAddress) {
      const address = extractedData.clientAddress.trim().toLowerCase();
      const isTimAddress = address.includes('59') && (address.includes('gloucester') || address.includes('bh7'));
      if (!isTimAddress) {
        validatedData.clientAddress = extractedData.clientAddress.trim();
        console.log('✅ Valid client address:', validatedData.clientAddress);
      } else {
        console.warn('❌ Blocked Tim address as client address');
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
        console.log('✅ Valid fee:', fee);
      }
    }

    console.log('🎯 Final universal validation result:', validatedData);
    return validatedData;

  } catch (error) {
    console.error('❌ Universal parsing failed:', error);
    throw error;
  }
}