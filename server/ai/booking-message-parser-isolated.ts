import Anthropic from '@anthropic-ai/sdk';
import { trackApiCall } from '../middleware/api-usage-tracker';
import crypto from 'crypto';

// Helper function to enrich venue data using Google Places API
async function enrichVenueData(venueName: string): Promise<any> {
  if (!venueName || !process.env.GOOGLE_MAPS_SERVER_KEY) {
    return null;
  }

  try {
    console.log(`🗺️ Enriching venue data for: ${venueName}`);

    // First, search for the venue
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    const searchBody = {
      textQuery: venueName,
      locationBias: {
        circle: {
          center: { latitude: 51.5074, longitude: -0.1278 },
          radius: 50000.0
        }
      },
      maxResultCount: 1,
      languageCode: 'en'
    };

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress'
      },
      body: JSON.stringify(searchBody)
    });

    const searchData = await searchResponse.json();
    if (!searchResponse.ok || !searchData.places?.length) {
      console.log(`❌ No venue found for: ${venueName}`);
      return null;
    }

    const place = searchData.places[0];
    const placeId = place.id;

    // Get detailed place information
    const detailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_MAPS_SERVER_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,rating,userRatingCount'
      }
    });

    const detailsData = await detailsResponse.json();
    if (!detailsResponse.ok) {
      console.log(`❌ Failed to get venue details for: ${venueName}`);
      return null;
    }

    const enrichedData = {
      name: detailsData.displayName?.text || venueName,
      formattedAddress: detailsData.formattedAddress || '',
      phoneNumber: detailsData.nationalPhoneNumber || detailsData.internationalPhoneNumber || '',
      website: detailsData.websiteUri || '',
      rating: detailsData.rating || null,
      openingHours: detailsData.regularOpeningHours?.weekdayDescriptions || []
    };

    console.log(`✅ Enriched venue data:`, enrichedData);
    return enrichedData;

  } catch (error) {
    console.warn(`Failed to enrich venue data for ${venueName}:`, error);
    return null;
  }
}

interface ParsedBookingData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  eventDate?: string;
  eventTime?: string;
  eventEndTime?: string;
  venue?: string;
  venueAddress?: string;
  venueContactInfo?: string;
  eventType?: string;
  fee?: number;
  deposit?: number;
  message?: string;
  specialRequirements?: string;
  confidence: number;
  venueDetails?: {
    phoneNumber?: string;
    website?: string;
    rating?: number;
    openingHours?: string[];
  };
  // Add metadata for validation
  parseMetadata?: {
    sessionId: string;
    messageHash: string;
    parsedAt: Date;
    messagePreview: string;
  };
}

// Helper functions for data cleaning
function cleanString(value: any): string | null {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function cleanEmail(value: any): string | null {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/[\w.-]+@[\w.-]+\.\w+/);
  return match ? match[0].toLowerCase() : null;
}

function cleanPhone(value: any): string | null {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.replace(/[^\d+\s()-]/g, '').trim();
  return cleaned.length >= 10 ? cleaned : null;
}

function cleanDate(value: any): string | null {
  if (!value || typeof value !== 'string') return null;
  // Basic validation for YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function cleanTime(value: any): string | null {
  if (!value || typeof value !== 'string') return null;
  // Basic validation for HH:MM format
  if (!/^\d{1,2}:\d{2}$/.test(value)) return null;
  return value;
}

function cleanEventType(value: any): string | null {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.toLowerCase().trim();
  return cleaned.length > 0 ? cleaned : null;
}

function cleanNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  const num = typeof value === 'string' 
    ? parseFloat(value.replace(/[£$€,]/g, ''))
    : parseFloat(value);
  return !isNaN(num) ? num : null;
}

/**
 * ISOLATED PARSER - Creates a new AI instance for each email to prevent context bleeding
 */
export async function parseBookingMessageIsolated(
  messageText: string,
  clientContact?: string,
  clientAddress?: string,
  userId?: string
): Promise<ParsedBookingData> {
  // Generate unique session ID for this parsing session
  const sessionId = `parse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const messageHash = crypto.createHash('sha256').update(messageText).digest('hex').substring(0, 16);
  
  console.log(`🔒 [${sessionId}] Starting ISOLATED parsing session`);
  console.log(`🔒 [${sessionId}] Message hash: ${messageHash}`);
  console.log(`🔒 [${sessionId}] Message preview: ${messageText.substring(0, 100)}...`);
  
  try {
    // Create a NEW Anthropic instance for complete isolation
    const isolatedAnthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    // Enhanced system prompt with explicit isolation instructions
    const systemPrompt = `You are an expert booking assistant for musicians. Parse booking inquiries and extract structured information.

CRITICAL ISOLATION REQUIREMENTS:
- This is session ${sessionId} - process ONLY the provided message
- DO NOT reference any previous conversations or messages
- DO NOT use any cached or remembered information
- RESET your context completely for this parsing task
- Parse THIS MESSAGE ONLY - ignore all external context

MESSAGE IDENTIFICATION:
- Message Hash: ${messageHash}
- Session ID: ${sessionId}
- Timestamp: ${new Date().toISOString()}

PARSING INSTRUCTIONS:
- Extract ALL available information from the message text ONLY
- Each message must be parsed independently with ZERO external context
- For dates: "June 23rd next year" = "2026-06-23", "June 23rd" = "2025-06-23", "next [month]" = next occurrence
- IMPORTANT: If message says "don't have the date", "no date yet", "next year" without specifics, or "TBC" = return null for eventDate
- For venues: Extract venue names exactly as mentioned (e.g., "Buckingham Palace")
- IGNORE company signatures, footers, and "sent from" addresses - only extract EVENT information
- For event types: wedding, party, corporate, pub, restaurant, festival, birthday, anniversary, etc.
- Extract client names, emails, phone numbers from the message or context
- Return HIGH confidence (0.8-1.0) if you extract date + venue + event type
- Return MEDIUM confidence (0.5-0.7) if you extract 2+ key details
- Return LOW confidence (0.1-0.4) for vague or minimal information
- Return VERY LOW confidence (0.1-0.2) if no specific date is provided

VALIDATION CHECK:
- Ensure ALL extracted data comes from THIS message only
- Do not include information that isn't explicitly stated in the message
- If uncertain, return null rather than guessing

REQUIRED JSON FORMAT:
{
  "clientName": "string or null",
  "clientEmail": "string or null", 
  "clientPhone": "string or null",
  "eventDate": "YYYY-MM-DD or null",
  "eventTime": "HH:MM or null",
  "eventEndTime": "HH:MM or null",
  "venue": "string or null",
  "venueAddress": "string or null",
  "eventType": "string or null",
  "fee": number or null,
  "deposit": number or null,
  "specialRequirements": "string or null",
  "confidence": number between 0.1 and 1.0
}

RESPOND WITH VALID JSON ONLY - NO EXPLANATIONS OR MARKDOWN.`;

    const userPrompt = `[SESSION ${sessionId}] Parse this SPECIFIC booking message and extract information ONLY from this text:

MESSAGE HASH: ${messageHash}
MESSAGE: "${messageText}"
${clientContact ? `CONTACT: "${clientContact}"` : ''}
${clientAddress ? `VENUE/LOCATION: "${clientAddress}"` : ''}

IMPORTANT: Extract details ONLY from the above message. Do not use any external context or previous messages.
Return valid JSON only:`;

    // Track API usage if userId is provided
    if (userId) {
      const canProceed = await trackApiCall(userId, 'claude', 'booking-message-parser-isolated');
      if (!canProceed) {
        throw new Error('API usage limit exceeded for Claude service');
      }
    }

    console.log(`🤖 [${sessionId}] Calling Claude API with isolated context...`);
    const startTime = Date.now();
    
    // Use fresh message with no conversation history
    const response = await isolatedAnthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 800,
      temperature: 0.1, // Low temperature for consistency
      system: systemPrompt,
      messages: [
        { 
          role: 'user', 
          content: userPrompt 
        }
      ]
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ [${sessionId}] Claude response time: ${responseTime}ms`);

    const rawContent = response.content[0]?.text;
    if (!rawContent) {
      throw new Error('No response from Claude');
    }

    console.log(`🤖 [${sessionId}] Claude raw response:`, rawContent);
    
    // Clean JSON response (remove markdown code blocks if present)
    let jsonContent = rawContent.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\s*/g, '').replace(/```\s*$/, '');
    }
    
    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error(`❌ [${sessionId}] JSON parse error:`, parseError);
      console.error('Raw content:', rawContent);
      throw new Error('Invalid JSON response from Claude');
    }
    
    // Validate parsed data matches our message
    console.log(`🔍 [${sessionId}] Validating parsed data...`);
    
    // Clean and validate the parsed data
    const cleanedData: ParsedBookingData = {
      clientName: cleanString(parsed.clientName || parsed.name),
      clientEmail: cleanEmail(parsed.clientEmail || parsed.email),
      clientPhone: cleanPhone(parsed.clientPhone || parsed.phone),
      eventDate: cleanDate(parsed.eventDate || parsed.date),
      eventTime: cleanTime(parsed.eventTime || parsed.startTime),
      eventEndTime: cleanTime(parsed.eventEndTime || parsed.endTime),
      venue: cleanString(parsed.venue || parsed.location),
      venueAddress: cleanString(parsed.venueAddress || parsed.address || clientAddress),
      eventType: cleanEventType(parsed.eventType || parsed.type),
      fee: cleanNumber(parsed.fee || parsed.budget || parsed.payment),
      deposit: cleanNumber(parsed.deposit),
      message: messageText,
      specialRequirements: cleanString(parsed.specialRequirements || parsed.requirements || parsed.notes),
      confidence: Math.min(1.0, Math.max(0.1, parsed.confidence || 0.5)),
      // Add metadata for validation
      parseMetadata: {
        sessionId,
        messageHash,
        parsedAt: new Date(),
        messagePreview: messageText.substring(0, 100)
      }
    };

    // Validation: Check if extracted data actually appears in the message
    const validateExtraction = () => {
      const warnings: string[] = [];
      const messageLower = messageText.toLowerCase();
      
      // Check if venue appears in message
      if (cleanedData.venue && !messageLower.includes(cleanedData.venue.toLowerCase())) {
        warnings.push(`Venue "${cleanedData.venue}" not found in message`);
      }
      
      // Check if date components appear in message
      if (cleanedData.eventDate) {
        const dateParts = cleanedData.eventDate.split('-');
        const hasDateReference = dateParts.some(part => messageText.includes(part));
        if (!hasDateReference) {
          warnings.push(`Date "${cleanedData.eventDate}" components not found in message`);
        }
      }
      
      if (warnings.length > 0) {
        console.warn(`⚠️ [${sessionId}] Validation warnings:`, warnings);
        // Lower confidence if validation fails
        cleanedData.confidence = Math.max(0.1, cleanedData.confidence * 0.7);
      }
    };
    
    validateExtraction();

    // Enrich venue data with Google Places information
    if (cleanedData.venue) {
      try {
        console.log(`🗺️ [${sessionId}] Attempting to enrich venue: ${cleanedData.venue}`);
        const venueData = await enrichVenueData(cleanedData.venue);
        
        if (venueData) {
          // Update venue information with enriched data
          cleanedData.venue = venueData.name;
          cleanedData.venueAddress = venueData.formattedAddress;
          cleanedData.venueContactInfo = venueData.phoneNumber;
          cleanedData.venueDetails = {
            phoneNumber: venueData.phoneNumber,
            website: venueData.website,
            rating: venueData.rating,
            openingHours: venueData.openingHours
          };
          
          console.log(`✅ [${sessionId}] Successfully enriched venue data for: ${cleanedData.venue}`);
        }
      } catch (error) {
        console.warn(`[${sessionId}] Failed to enrich venue data:`, error);
      }
    }

    console.log(`✅ [${sessionId}] Parsing complete with confidence: ${cleanedData.confidence}`);
    console.log(`📊 [${sessionId}] Extracted data:`, {
      eventDate: cleanedData.eventDate,
      venue: cleanedData.venue,
      eventType: cleanedData.eventType,
      fee: cleanedData.fee,
      confidence: cleanedData.confidence
    });
    
    return cleanedData;

  } catch (error) {
    console.error(`❌ [${sessionId}] Error parsing booking message:`, error);
    
    // Return minimal data on error
    return {
      message: messageText,
      confidence: 0.1,
      parseMetadata: {
        sessionId,
        messageHash,
        parsedAt: new Date(),
        messagePreview: messageText.substring(0, 100)
      }
    };
  }
}

// Export original function name for backward compatibility, but use isolated version
export const parseBookingMessage = parseBookingMessageIsolated;