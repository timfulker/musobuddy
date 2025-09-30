import { aiOrchestrator } from './ai-orchestrator';

/**
 * Specialized function to parse booking confirmations (not new bookings)
 * Uses AI orchestrator with appropriate validation for confirmations
 */
export async function parseBookingConfirmation(messageContent: string, existingBooking: any): Promise<any> {
  try {
    console.log('🎯 [CONFIRMATION-PARSER] Parsing booking confirmation message...');
    
    // Use the singleton instance directly
    
    const systemPrompt = `You are extracting details from a BOOKING CONFIRMATION message (not a new booking inquiry).
The booking already exists with these details:
- Client: ${existingBooking.clientName || 'Unknown'}
- Event: ${existingBooking.eventType || existingBooking.gigType || 'Unknown'}
- Date: ${existingBooking.eventDate || 'Unknown'}
- Venue: ${existingBooking.venue || 'Unknown'}

IMPORTANT: This message could be either:
1. A CLIENT confirming/accepting a booking offer
2. A MUSICIAN confirming booking details to a client

Extract confirmation-specific information from the message:

Return JSON with these fields (only include if found in message):
{
  "clientConfirmsBooking": boolean, // true if client confirms/accepts booking
  "serviceSelection": string, // specific service they chose (e.g., "2-hour saxophone")
  "packageSelection": string, // package name if selecting from options (e.g., "3-hour piano and DJ option")
  "feeAccepted": number, // fee amount they agreed to OR calculate from package selection
  "calculatedFromPackage": boolean, // true if fee was calculated from package selection
  "requestsContract": boolean, // true if they request booking agreement/contract
  "eventTime": string, // start time in HH:MM format (24-hour)
  "eventEndTime": string, // end time in HH:MM format (24-hour)
  "notes": string, // any additional requests or notes
  "confidence": number // 0.0-1.0 confidence in extraction
}

PACKAGE SELECTION AND PRICING RULES:
1. If client selects a package by name (e.g., "3-hour piano and DJ option"), extract as packageSelection
2. CRITICAL: When client says "we would like to go with the 3-hour piano and the DJ option":
   - Look in PREVIOUS MESSAGE section for ALL prices
   - Find "3-hour piano" price (e.g., "3-hour piano: £450")
   - Find "DJ" price (e.g., "DJ option: £210" or "DJ add-on: £210")
   - Calculate total: £450 + £210 = £660
   - Set feeAccepted: 660 and calculatedFromPackage: true
3. Common package combinations to calculate:
   - "3-hour piano and DJ option" = Find 3-hour piano price + DJ price
   - "2-hour piano with DJ" = Find 2-hour piano price + DJ price
   - "piano and sax duo" = Find duo price or add individual prices
4. If ANY message mentions total directly (e.g., "£660 total"), use that as feeAccepted
5. IMPORTANT: If you see "The total fee for this package is £660", ALWAYS extract 660 as feeAccepted
6. IMPORTANT: If you see "The total fee is £660", ALWAYS extract 660 as feeAccepted
7. IMPORTANT: Extract prices from musician confirmation messages the same way as client messages

TIME EXTRACTION RULES:
- eventTime: Extract start time and convert to 24-hour format (e.g., "7pm" → "19:00", "1:00 pm" → "13:00")
- eventEndTime: Extract end time and convert to 24-hour format (e.g., "11pm" → "23:00", "4:00 pm" → "16:00")
- Handle phrases like "Between 7pm and 11pm", "from 2pm to 6pm", "starts at 7:30pm", "1:00 pm and go through to 4:00 pm"
- If only one time mentioned, put it in eventTime and leave eventEndTime null

Examples:
CLIENT MESSAGES:
- Input: "PREVIOUS MESSAGE:\nHere are the packages:\n- 2-hour piano: £350\n- 3-hour piano: £450\n- DJ add-on: £210\n\nCURRENT MESSAGE:\nWe would like to go with the 3-hour piano and the DJ option please"
  → {"clientConfirmsBooking": true, "packageSelection": "3-hour piano and DJ option", "feeAccepted": 660, "calculatedFromPackage": true, "confidence": 0.9}
- "We would like to go with the 2-hour saxophone at £310" → {"clientConfirmsBooking": true, "serviceSelection": "2-hour saxophone", "feeAccepted": 310, "confidence": 0.9}
- "Please send the contract" → {"requestsContract": true, "confidence": 0.8}
- "We would like you to start playing at about 1:00 pm and go through to 4:00 pm" → {"eventTime": "13:00", "eventEndTime": "16:00", "confidence": 0.9}

MUSICIAN MESSAGES (confirming to client):
- "Thank you for confirming your booking for the 3-hour piano and DJ package on October 27th, 2026, at Clearwell Castle. I'm delighted to be part of your special day and will be ready to start at 1:00 pm, continuing until 4:00 pm for your wedding breakfast transition. The total fee for this package is £660, which includes all travel expenses and equipment setup." → {"packageSelection": "3-hour piano and DJ package", "eventTime": "13:00", "eventEndTime": "16:00", "feeAccepted": 660, "confidence": 0.95}
- "The total fee for this package is £660" → {"feeAccepted": 660, "confidence": 0.95}
- "I will send the booking agreement via a secure link shortly" → {"requestsContract": true, "confidence": 0.8}`;

    const userPrompt = `MESSAGE: ${messageContent}

JSON:`;

    const request = {
      systemPrompt,
      userPrompt,
      responseFormat: 'json_object' as const,
      temperature: 0.1,
      maxTokens: 500
    };

    const config = {
      models: ['gpt-4o', 'claude-sonnet-4'] as const, // Start with quality models
      confidenceThreshold: 0.8, // Higher threshold for accuracy
      maxBudgetCents: 50, // Higher budget for quality
      validators: [
        (result: any) => {
          try {
            const parsed = JSON.parse(result.content);
            if (typeof parsed !== 'object') return { valid: false, errors: ['Invalid JSON object'] };
            return { valid: true }; // More lenient validation
          } catch (e) {
            return { valid: false, errors: ['JSON parsing failed: ' + e.message] };
          }
        }
      ],
      scorer: (result: any) => {
        try {
          const parsed = JSON.parse(result.content);
          return parsed.confidence || 0.7; // Higher default confidence for confirmations
        } catch {
          return 0.1;
        }
      }
    };

    const orchestrationResult = await aiOrchestrator.runTask('confirmation-parsing', request, config);

    if (orchestrationResult.success) {
      const parsed = JSON.parse(orchestrationResult.response.content);
      console.log('✅ [CONFIRMATION-PARSER] Successfully parsed confirmation:', parsed);
      
      // Convert to format expected by extraction UI
      // Based on message content, determine if this is performance fee or total fee
      const messageText = messageContent.toLowerCase();
      const isTotalFeeContext = messageText.includes('total') || messageText.includes('including') ||
                                messageText.includes('overall') || messageText.includes('all in') ||
                                messageText.includes('inc travel') ||
                                parsed.calculatedFromPackage === true; // Package calculations are always total

      const result: any = {
        clientConfirmsBooking: parsed.clientConfirmsBooking || false,
        performanceDuration: parsed.serviceSelection || parsed.packageSelection, // Map to field expected by UI
        packageSelection: parsed.packageSelection, // Include package selection if present
        requestsContract: parsed.requestsContract || false,
        eventTime: parsed.eventTime || null, // ADD MISSING TIME FIELDS
        eventEndTime: parsed.eventEndTime || null, // ADD MISSING TIME FIELDS
        specialRequirements: parsed.notes,
        confidence: parsed.confidence || 0.7,
        calculatedFromPackage: parsed.calculatedFromPackage || false
      };

      // Map fee to appropriate field based on context
      if (parsed.feeAccepted) {
        if (isTotalFeeContext) {
          result.totalFee = parsed.feeAccepted;
        } else {
          result.fee = parsed.feeAccepted; // Performance fee
        }
      }
      
      return result;
    } else {
      console.log('❌ [CONFIRMATION-PARSER] AI orchestrator failed, using fallback');
      return basicConfirmationParse(messageContent);
    }
    
  } catch (error) {
    console.error('❌ [CONFIRMATION-PARSER] Error:', error);
    return basicConfirmationParse(messageContent);
  }
}

/**
 * Simple fallback confirmation parser without AI
 */
function basicConfirmationParse(messageContent: string): any {
  const lowerMessage = messageContent.toLowerCase();

  // Check for confirmation keywords
  const confirmationKeywords = ['would like to go with', 'we accept', 'confirmed', 'yes please', 'that sounds good', 'perfect', 'we would like'];
  const clientConfirms = confirmationKeywords.some(keyword => lowerMessage.includes(keyword));

  // Extract package selections
  let packageSelection = null;
  let calculatedFee = null;

  // Check for common package patterns
  if (lowerMessage.includes('3-hour piano') && lowerMessage.includes('dj')) {
    packageSelection = '3-hour piano and DJ option';
    // If previous message had prices, try to extract and calculate them
    if (messageContent.includes('PREVIOUS MESSAGE:')) {
      // Look for specific package prices
      const threehourPianoMatch = messageContent.match(/3-hour piano[:\s]+£(\d+)/i);
      const djMatch = messageContent.match(/dj\s*(?:option|add-on)?[:\s]+£(\d+)/i);

      if (threehourPianoMatch && djMatch) {
        const pianoPrice = parseInt(threehourPianoMatch[1]);
        const djPrice = parseInt(djMatch[1]);
        calculatedFee = pianoPrice + djPrice;
      } else {
        // Fallback: sum all prices found in previous message
        const previousSection = messageContent.split('CURRENT MESSAGE:')[0];
        const priceMatches = previousSection.matchAll(/£(\d+)/g);
        const prices = Array.from(priceMatches).map(m => parseInt(m[1]));
        if (prices.length >= 2) {
          // Assuming the relevant prices are listed
          calculatedFee = prices.filter(p => p > 100).reduce((sum, p) => sum + p, 0);
        }
      }
    }
  } else if (lowerMessage.includes('2-hour piano') && lowerMessage.includes('dj')) {
    packageSelection = '2-hour piano and DJ option';
    if (messageContent.includes('PREVIOUS MESSAGE:')) {
      const twohourPianoMatch = messageContent.match(/2-hour piano[:\s]+£(\d+)/i);
      const djMatch = messageContent.match(/dj\s*(?:option|add-on)?[:\s]+£(\d+)/i);

      if (twohourPianoMatch && djMatch) {
        const pianoPrice = parseInt(twohourPianoMatch[1]);
        const djPrice = parseInt(djMatch[1]);
        calculatedFee = pianoPrice + djPrice;
      }
    }
  } else if (lowerMessage.includes('2-hour') && (lowerMessage.includes('piano') || lowerMessage.includes('sax'))) {
    packageSelection = lowerMessage.includes('piano') ? '2-hour piano' : '2-hour saxophone';
  }

  // Extract fee amounts - look for common patterns
  let fee = calculatedFee;

  // Pattern 1: "The total fee for this package is £660"
  const totalFeePattern = /(?:total\s+)?fee\s+(?:for\s+this\s+package\s+)?is\s+£(\d+)/i;
  const totalFeeMatch = messageContent.match(totalFeePattern);
  if (totalFeeMatch) {
    fee = parseInt(totalFeeMatch[1]);
  } else {
    // Pattern 2: Any £ amount in the message
    const feeMatch = messageContent.match(/£(\d+)/);
    fee = fee || (feeMatch ? parseInt(feeMatch[1]) : null);
  }

  // Extract times
  let eventTime = null;
  let eventEndTime = null;
  const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)/g;
  const timeMatches = Array.from(messageContent.matchAll(timePattern));

  if (timeMatches.length >= 2) {
    // Convert first match to 24-hour format
    const [_, hours1, mins1, ampm1] = timeMatches[0];
    let h1 = parseInt(hours1);
    if (ampm1.toLowerCase() === 'pm' && h1 < 12) h1 += 12;
    if (ampm1.toLowerCase() === 'am' && h1 === 12) h1 = 0;
    eventTime = `${h1.toString().padStart(2, '0')}:${(mins1 || '00').padStart(2, '0')}`;

    // Convert second match to 24-hour format
    const [__, hours2, mins2, ampm2] = timeMatches[1];
    let h2 = parseInt(hours2);
    if (ampm2.toLowerCase() === 'pm' && h2 < 12) h2 += 12;
    if (ampm2.toLowerCase() === 'am' && h2 === 12) h2 = 0;
    eventEndTime = `${h2.toString().padStart(2, '0')}:${(mins2 || '00').padStart(2, '0')}`;
  } else if (timeMatches.length === 1) {
    const [_, hours, mins, ampm] = timeMatches[0];
    let h = parseInt(hours);
    if (ampm.toLowerCase() === 'pm' && h < 12) h += 12;
    if (ampm.toLowerCase() === 'am' && h === 12) h = 0;
    eventTime = `${h.toString().padStart(2, '0')}:${(mins || '00').padStart(2, '0')}`;
  }

  // Check for contract/agreement requests
  const requestsContract = lowerMessage.includes('agreement') || lowerMessage.includes('contract') || lowerMessage.includes('paperwork');

  const messageText = messageContent.toLowerCase();
  const isTotalFeeContext = messageText.includes('total fee') || messageText.includes('total') ||
                            messageText.includes('including') || messageText.includes('overall') ||
                            messageText.includes('all in') || messageText.includes('inc travel') ||
                            messageText.includes('package is £') || calculatedFee !== null ||
                            totalFeeMatch !== null;

  const result: any = {
    clientConfirmsBooking: clientConfirms,
    requestsContract,
    confidence: 0.6,
    eventTime,
    eventEndTime,
    packageSelection,
    calculatedFromPackage: calculatedFee !== null
  };

  // Map fee to appropriate field based on context
  if (fee) {
    if (isTotalFeeContext) {
      result.totalFee = fee;
    } else {
      result.fee = fee; // Performance fee
    }
  }

  return result;
}