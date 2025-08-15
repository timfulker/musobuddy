import OpenAI from 'openai';
import { trackApiCall } from '../middleware/api-usage-tracker';

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

// Enhanced booking message parser using OpenAI for better availability

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
}

export async function parseBookingMessage(
  messageText: string,
  clientContact?: string,
  clientAddress?: string,
  userId?: string
): Promise<ParsedBookingData> {
  try {
    console.log('🤖 OpenAI: Parsing booking message with enhanced AI for better cost efficiency...');
    console.log('🤖 OpenAI: Message length:', messageText?.length || 0);
    console.log('🤖 OpenAI: First 200 chars:', messageText?.substring(0, 200) || 'No content');
    
    const systemPrompt = `You are an expert booking assistant for musicians. Parse booking inquiries and extract structured information.

CRITICAL INSTRUCTIONS:
- Extract ALL available information from the message text ONLY
- Each message must be parsed independently - do not use any external context or previous messages
- For dates: "June 23rd next year" = "2026-06-23", "June 23rd" = "2025-06-23", "next [month]" = next occurrence
- IMPORTANT: If message says "don't have the date", "no date yet", "TBC", or just "next year" without month/day = return null for eventDate
- SPECIFIC DATES: "June 17th next year" = "2026-06-17", "March 15th 2026" = "2026-03-15" - these ARE valid dates
- For venues: Extract venue names exactly as mentioned (e.g., "Buckingham Palace")
- IGNORE company signatures, footers, and "sent from" addresses - only extract EVENT information
- For event types: wedding, party, corporate, pub, restaurant, festival, birthday, anniversary, etc.
- Extract client names, emails, phone numbers from the message or context
- Return HIGH confidence (0.8-1.0) if you extract date + venue + event type
- Return MEDIUM confidence (0.5-0.7) if you extract 2+ key details
- Return LOW confidence (0.1-0.4) for vague or minimal information
- Return VERY LOW confidence (0.1-0.2) if no specific date is provided

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

    const userPrompt = `Parse this booking message and extract all available information:

MESSAGE: "${messageText}"
${clientContact ? `CONTACT: "${clientContact}"` : ''}
${clientAddress ? `VENUE/LOCATION: "${clientAddress}"` : ''}

Analyze and extract ALL booking details. Return valid JSON only:`;

    // Track API usage if userId is provided
    if (userId) {
      const canProceed = await trackApiCall(userId, 'openai', 'booking-message-parser');
      if (!canProceed) {
        throw new Error('API usage limit exceeded for OpenAI service');
      }
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      max_tokens: 800,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    });
    
    const responseTime = Date.now() - startTime;

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('No response from OpenAI');
    }

    console.log('🤖 OpenAI raw response:', rawContent);
    
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
      console.error('❌ JSON parse error:', parseError);
      console.error('Raw content:', rawContent);
      throw new Error('Invalid JSON response from OpenAI');
    }
    
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
      confidence: Math.min(1.0, Math.max(0.1, parsed.confidence || 0.5))
    };

    // Enrich venue data with Google Places information
    if (cleanedData.venue) {
      try {
        console.log(`🗺️ Attempting to enrich venue: ${cleanedData.venue}`);
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
          
          console.log(`✅ Successfully enriched venue data for: ${cleanedData.venue}`);
        }
      } catch (error) {
        console.warn('Failed to enrich venue data:', error);
      }
    }

    // Enhanced Encore apply-now link extraction (handles tracking URLs)
    const applyNowLink = extractEncoreApplyLink(messageText);
    if (applyNowLink) {
      cleanedData.applyNowLink = applyNowLink;
      console.log(`🎵 Extracted Encore apply-now link: ${cleanedData.applyNowLink}`);
    }
    
    // Detect Encore emails even without clickable links
    const isEncoreEmail = messageText.toLowerCase().includes('encore musicians') || 
                         messageText.includes('notification@encoremusicians.com') ||
                         messageText.includes('encoremusicians.com');
    
    if (isEncoreEmail && !applyNowLink) {
      console.log('🎵 Encore email detected but no clickable apply-now link found (likely forwarded email)');
      
      // Extract job ID if present for manual URL construction
      const jobIdMatch = messageText.match(/\[([a-zA-Z0-9]+)\]$/m);
      if (jobIdMatch) {
        const jobId = jobIdMatch[1];
        console.log(`🎵 Encore job ID extracted: ${jobId}`);
        // Add a note to the special requirements about the Encore job
        const encoreNote = `Encore Musicians job [${jobId}] - Apply-now URL not available in forwarded email`;
        cleanedData.specialRequirements = cleanedData.specialRequirements 
          ? `${cleanedData.specialRequirements}. ${encoreNote}`
          : encoreNote;
      }
    }

    // Add client contact info if provided but not extracted
    if (clientContact && !cleanedData.clientName && !cleanedData.clientEmail && !cleanedData.clientPhone) {
      if (clientContact.includes('@')) {
        cleanedData.clientEmail = clientContact;
      } else if (/\d{10,}/.test(clientContact)) {
        cleanedData.clientPhone = clientContact;
      } else {
        cleanedData.clientName = clientContact;
      }
    }

    console.log('🎯 OpenAI: Parsed booking data:', {
      ...cleanedData,
      message: `${messageText.substring(0, 100)}...`
    });

    return cleanedData;

  } catch (error: any) {
    console.error('❌ OpenAI booking parse error:', error);
    
    // Fallback parsing using simple text analysis
    console.log('🔄 Falling back to simple text analysis...');
    return simpleTextParse(messageText, clientContact, clientAddress);
  }
}

// Extract Encore apply-now links from both plain text and HTML tracking URLs
function extractEncoreApplyLink(messageText: string): string | null {
  // Pattern 1: Direct encoremusicians.com URLs
  const directPatterns = [
    /https:\/\/(?:www\.)?encoremusicians\.com\/[^\s<>"']+/gi,
    /https:\/\/[^\/\s]*\.encoremusicians\.com\/[^\s<>"']+/gi
  ];
  
  for (const pattern of directPatterns) {
    const match = messageText.match(pattern);
    if (match) {
      return match[0];
    }
  }
  
  // Pattern 2: AWS tracking URLs - extract and decode the actual Encore URL
  const trackingPatterns = [
    /https:\/\/[^\/\s]*\.awstrack\.me\/[^\/\s]*\/https:%2F%2Fencoremusicians\.com[^\s<>"']+/gi,
    /https:\/\/[^\/\s]*\.r\.[^\/\s]*\.awstrack\.me\/[^\/\s]*\/https:%2F%2Fencoremusicians\.com[^\s<>"']+/gi
  ];
  
  for (const pattern of trackingPatterns) {
    const match = messageText.match(pattern);
    if (match) {
      const trackingUrl = match[0];
      console.log(`🔍 Found AWS tracking URL: ${trackingUrl}`);
      
      // Extract the encoded Encore URL from the tracking wrapper
      const encoreUrlMatch = trackingUrl.match(/https:%2F%2Fencoremusicians\.com[^\/\s]*/);
      if (encoreUrlMatch) {
        // Decode the URL-encoded Encore link
        const encodedUrl = encoreUrlMatch[0];
        const decodedUrl = decodeURIComponent(encodedUrl);
        console.log(`🎵 Decoded Encore URL: ${decodedUrl}`);
        return decodedUrl;
      }
      
      // Fallback: return the tracking URL if decoding fails
      return trackingUrl;
    }
  }
  
  // Pattern 3: Look for href attributes in HTML containing Encore URLs
  const hrefPattern = /href=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["']/gi;
  let hrefMatch;
  while ((hrefMatch = hrefPattern.exec(messageText)) !== null) {
    const url = hrefMatch[1];
    if (url.includes('encoremusicians.com')) {
      return url;
    }
    if (url.includes('awstrack.me') && url.includes('encoremusicians')) {
      // Try to decode tracking URL
      const encoreUrlMatch = url.match(/https:%2F%2Fencoremusicians\.com[^&]*/);
      if (encoreUrlMatch) {
        return decodeURIComponent(encoreUrlMatch[0]);
      }
      return url;
    }
  }
  
  // Pattern 4: Extract job ID from email subject and construct proper URL
  // Look for patterns like [IQ4qx] in subject or message text
  const jobIdPattern = /\[([A-Za-z0-9]{4,6})\]/;
  const jobIdMatch = messageText.match(jobIdPattern);
  if (jobIdMatch) {
    const jobId = jobIdMatch[1];
    console.log(`🎵 Found Encore job ID: ${jobId}`);
    return `https://encoremusicians.com/jobs/${jobId}?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow`;
  }

  return null;
}

// Helper functions for data cleaning
function cleanString(value: any): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanEmail(value: any): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim()) ? value.trim().toLowerCase() : undefined;
}

function cleanPhone(value: any): string | undefined {
  if (!value) return undefined;
  const phoneStr = String(value).replace(/\D/g, '');
  return phoneStr.length >= 10 ? phoneStr : undefined;
}

function cleanDate(value: any): string | undefined {
  if (!value) return undefined;
  
  try {
    // Handle various date formats
    const dateStr = String(value).trim().toLowerCase();
    
    // CRITICAL: Check for vague date patterns first - return null if no specific date
    const vaguePatterns = [
      'next year',
      'no date',
      'don\'t have the date',
      'tbc',
      'to be confirmed',
      'not sure',
      'uncertain'
    ];
    
    if (vaguePatterns.some(pattern => dateStr.includes(pattern))) {
      console.log(`📅 Vague date pattern detected: "${dateStr}" - returning null`);
      return undefined;
    }
    
    // Try parsing as ISO date first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Handle specific "next year" scenarios with actual dates
    let normalizedDateStr = dateStr;
    if (dateStr.includes('next year') && dateStr.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2})/)) {
      // Only convert if there's a specific month/day mentioned
      normalizedDateStr = dateStr.replace(/next year/gi, '2026');
    } else if (dateStr.includes('this year')) {
      normalizedDateStr = dateStr.replace(/this year/gi, '2025');
    }
    
    // Try parsing natural language dates
    const parsed = new Date(normalizedDateStr);
    if (!isNaN(parsed.getTime()) && parsed > new Date()) {
      return parsed.toISOString().split('T')[0];
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}

function cleanTime(value: any): string | undefined {
  if (!value) return undefined;
  
  const timeStr = String(value).trim();
  // Match HH:MM format (24-hour or 12-hour with AM/PM)
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?:\s?(AM|PM))?/i);
  
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2];
    const ampm = timeMatch[3]?.toUpperCase();
    
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
  
  return undefined;
}

function cleanEventType(value: any): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  
  const eventType = value.toLowerCase().trim();
  const eventTypes = ['wedding', 'party', 'corporate', 'pub', 'restaurant', 'festival', 'birthday', 'anniversary'];
  
  for (const type of eventTypes) {
    if (eventType.includes(type)) {
      return type;
    }
  }
  
  return eventType.length > 0 ? eventType : undefined;
}

function cleanNumber(value: any): number | undefined {
  if (!value) return undefined;
  
  const numStr = String(value).replace(/[^\d.]/g, '');
  const parsed = parseFloat(numStr);
  
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

// Simple fallback parser for when Claude fails
function simpleTextParse(messageText: string, clientContact?: string, clientAddress?: string): ParsedBookingData {
  console.log('🔍 Using enhanced fallback text parsing...');
  
  const text = messageText.toLowerCase();
  const data: ParsedBookingData = {
    message: messageText,
    confidence: 0.3
  };

  // Extract basic event types with higher confidence
  const eventTypes = ['wedding', 'party', 'corporate', 'pub', 'restaurant', 'festival', 'birthday', 'anniversary'];
  for (const type of eventTypes) {
    if (text.includes(type)) {
      data.eventType = type;
      data.confidence = Math.min(0.6, data.confidence + 0.3); // Boost confidence
      break;
    }
  }

  // Extract venue/location from message (improved patterns)
  const venuePatterns = [
    /at ([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i, // "at Brighton Church" (stop at fee)
    /venue:\s*([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i,
    /reception at ([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i,
    /location:\s*([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i,
    /held at ([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i
  ];
  
  for (const pattern of venuePatterns) {
    const venueMatch = messageText.match(pattern);
    if (venueMatch && venueMatch[1].trim().length > 2) {
      data.venue = venueMatch[1].trim();
      data.confidence = Math.min(0.7, data.confidence + 0.2);
      break;
    }
  }

  // Enhanced date extraction with better patterns
  const datePatterns = [
    /(?:on\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?\s+\d{4})/i, // "March 15th 2026"
    /(?:on\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+next year)?)/i, // "March 15th next year"
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{4}-\d{2}-\d{2})/
  ];
  
  for (const pattern of datePatterns) {
    const dateMatch = messageText.match(pattern);
    if (dateMatch) {
      let dateStr = dateMatch[1].toLowerCase().trim();
      console.log(`📅 Found potential date: "${dateStr}"`);
      
      // Handle "next year" conversion
      if (dateStr.includes('next year')) {
        dateStr = dateStr.replace('next year', '2026');
      } else if (dateStr.match(/\w+\s+\d{1,2}/) && !dateStr.match(/20\d{2}/)) {
        // If it's just "March 15th" without year, default to next occurrence
        const currentYear = new Date().getFullYear();
        dateStr += ` ${currentYear + 1}`;
      }
      
      try {
        console.log(`📅 Attempting to parse: "${dateStr}"`);
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime()) && parsedDate > new Date()) {
          data.eventDate = parsedDate.toISOString().split('T')[0];
          data.confidence = Math.min(0.8, data.confidence + 0.3);
          console.log(`✅ Successfully parsed date: ${data.eventDate}`);
        }
      } catch (e) {
        console.log(`❌ Date parsing failed for: "${dateStr}"`);
      }
      break;
    }
  }

  // Extract email if present in message
  const emailMatch = messageText.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  if (emailMatch) {
    data.clientEmail = emailMatch[0].toLowerCase();
    data.confidence = Math.min(0.7, data.confidence + 0.2);
  }

  // Extract phone if present
  const phoneMatch = messageText.match(/\d{10,}/);
  if (phoneMatch) {
    data.clientPhone = phoneMatch[0];
    data.confidence = Math.min(0.7, data.confidence + 0.2);
  }

  // Add provided contact info
  if (clientContact) {
    if (clientContact.includes('@')) {
      data.clientEmail = clientContact;
    } else if (/\d{10,}/.test(clientContact)) {
      data.clientPhone = clientContact;
    } else {
      data.clientName = clientContact;
    }
  }

  if (clientAddress) {
    data.venueAddress = clientAddress;
  }

  // Simple date extraction (very basic)
  const dateWords = ['january', 'february', 'march', 'april', 'may', 'june',
                     'july', 'august', 'september', 'october', 'november', 'december'];
  
  for (const month of dateWords) {
    if (text.includes(month)) {
      data.confidence = 0.5; // Higher confidence if we find a month
      break;
    }
  }

  return data;
}