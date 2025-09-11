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

Extract ONLY confirmation-specific information from the client's message:

Return JSON with these fields (only include if found in message):
{
  "clientConfirmsBooking": boolean, // true if client confirms/accepts booking
  "serviceSelection": string, // specific service they chose (e.g., "2-hour saxophone")
  "feeAccepted": number, // fee amount they agreed to
  "requestsContract": boolean, // true if they request booking agreement/contract
  "notes": string, // any additional requests or notes
  "confidence": number // 0.0-1.0 confidence in extraction
}

Examples:
- "We would like to go with the 2-hour saxophone at £310" → {"clientConfirmsBooking": true, "serviceSelection": "2-hour saxophone", "feeAccepted": 310, "confidence": 0.9}
- "Please send the contract" → {"requestsContract": true, "confidence": 0.8}
- "Can we change to 3 hours instead?" → {"serviceSelection": "3 hours", "confidence": 0.8}`;

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
      models: ['gpt-4o-mini', 'gpt-4o', 'claude-sonnet-4'] as const,
      confidenceThreshold: 0.6, // Lower threshold for confirmations
      maxBudgetCents: 30,
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
      return {
        clientConfirmsBooking: parsed.clientConfirmsBooking || false,
        serviceSelection: parsed.serviceSelection,
        totalFee: parsed.feeAccepted,
        fee: parsed.feeAccepted, // Also map to fee field
        requestsContract: parsed.requestsContract || false,
        specialRequirements: parsed.notes,
        confidence: parsed.confidence || 0.7
      };
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
  const confirmationKeywords = ['would like to go with', 'we accept', 'confirmed', 'yes please', 'that sounds good', 'perfect'];
  const clientConfirms = confirmationKeywords.some(keyword => lowerMessage.includes(keyword));
  
  // Extract fee amounts
  const feeMatch = messageContent.match(/£(\d+)/);
  const fee = feeMatch ? parseInt(feeMatch[1]) : null;
  
  // Check for contract/agreement requests
  const requestsContract = lowerMessage.includes('agreement') || lowerMessage.includes('contract') || lowerMessage.includes('paperwork');
  
  return {
    clientConfirmsBooking: clientConfirms,
    totalFee: fee,
    fee: fee,
    requestsContract,
    confidence: 0.6 // Higher confidence for simple patterns
  };
}