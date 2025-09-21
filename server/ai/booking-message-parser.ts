import OpenAI from 'openai';
import { aiOrchestrator, AIRequest, TaskConfig } from '../services/ai-orchestrator';
import { ValidatorFactory, ScorerFactory } from '../services/ai-validators';
// API usage tracking removed - unlimited AI usage for all users

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
  travelExpense?: number;  // Separate travel costs
  deposit?: number;
  message?: string;
  specialRequirements?: string;
  confidence: number;
  applyNowLink?: string;  // For Encore bookings
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
  userId?: string,
  subject?: string  // Added subject parameter for Encore area extraction
): Promise<ParsedBookingData> {
  try {
    console.log('🤖 GPT-4o mini: Parsing booking message with enhanced AI for better accuracy...');
    console.log('🤖 GPT-5 mini: Message length:', messageText?.length || 0);
    console.log('🤖 GPT-5 mini: First 200 chars:', messageText?.substring(0, 200) || 'No content');
    console.log('🤖 GPT-5 mini: Subject:', subject || 'No subject');
    console.log('🤖 GPT-5 mini: Client Contact:', clientContact || 'None');
    console.log('🤖 GPT-5 mini: Client Address:', clientAddress || 'None');
    
    // Get current date for context
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentYear = today.getFullYear();
    
    const systemPrompt = `You're extracting booking details from musician emails. Today is ${currentDate}.

When you see dates without a year, always assume they mean the NEXT occurrence of that date:
- "November 24th" → the next November 24th from today
- "June 16th" → the next June 16th from today  
- "We're getting married on March 5th" → the next March 5th from today

This means if today is August 2025:
- "September 10th" → September 10, 2025
- "June 16th" → June 16, 2026 (next occurrence)
- "March 5th" → March 5, 2026 (next occurrence)

Extract and return JSON with this structure:
{"clientName":"string","clientEmail":"string","eventDate":"YYYY-MM-DD","eventTime":"HH:MM","eventEndTime":"HH:MM","venue":"string","venueAddress":"string","eventType":"string","fee":number,"travelExpense":number,"deposit":number,"applyNowLink":"string","confidence":0.9}

TIME EXTRACTION RULES:
- eventTime: Start time in 24-hour format (HH:MM). Extract from phrases like "7pm" → "19:00", "at 2:30" → "14:30"
- eventEndTime: End time in 24-hour format (HH:MM). Extract from phrases like "until 11pm" → "23:00", "Between 7pm and 11pm" → eventTime:"19:00", eventEndTime:"23:00"
- Common time formats to recognize: "7pm", "7:30pm", "19:00", "7.30", "between 7pm and 11pm", "from 2pm to 6pm"
- If only one time mentioned, put it in eventTime and leave eventEndTime null
- If no times mentioned, leave both null

CRITICAL VENUE VS LOCATION RULES:
- venue: ONLY put actual venue names here (e.g., "City Hall", "The Royal Hotel", "St. Mary's Church", "Riverside Theatre")
- venueAddress: Put location/address information here (e.g., "Glasgow", "London", "123 Main St", "near Birmingham")
- If someone says "in Glasgow" or "in Birmingham", that's a location - put "Glasgow" or "Birmingham" in venueAddress, leave venue BLANK
- If someone says "at Glasgow City Hall", put "Glasgow City Hall" in venue and "Glasgow" in venueAddress
- When in doubt, leave venue BLANK - better to have no venue than wrong venue

CRITICAL EMAIL EXTRACTION RULES:
- NEVER use service emails from FROM field (no-reply@weebly.com, noreply@, notifications@, etc.)
- ALWAYS prioritize actual client emails from the email content (forms, signatures, contact info)
- Look for email addresses in: contact forms, signatures, "reply to:", "email:", "contact:", etc.
- If email contains "Email: tim@timfulker.com" use tim@timfulker.com, NOT the FROM address

Important: Get the client's actual name AND email from the email signature or body content, not from the FROM email field. Always provide eventDate in YYYY-MM-DD format when any date is mentioned.

FEE EXTRACTION RULES:
- fee: The performance fee amount (base payment for the service, EXCLUDING travel)
- travelExpense: Any travel or transport costs mentioned separately (e.g., "plus £30 travel", "including £25 for travel")
- deposit: Any deposit amount mentioned
- If only one total amount is mentioned (e.g., "£250"), put it all in fee and leave travelExpense as null
- If travel is mentioned separately (e.g., "£200 plus £30 travel"), extract as fee:200, travelExpense:30
- Extract numbers only, no currency symbols

ENCORE APPLY NOW LINK EXTRACTION:
- applyNowLink: Extract the COMPLETE URL from "Apply now" buttons or links in Encore Musicians emails
- CRITICAL: Extract the ENTIRE URL - do not truncate or shorten it. URLs can be very long (200+ characters)
- Look for URLs near text like "Apply now", "Apply for this job", "Apply"
- Common patterns: https://www.encoremusicians.com/jobs/ABC123, https://encoremusicians.com/...
- AWS tracking URLs are often VERY LONG: https://email.r.email.encoremusicians.com/mk/cl/f/sh/...
- NEVER truncate with "..." - always include the complete URL no matter how long
- If you find any encoremusicians.com URL in the email, especially near "Apply" text, include THE COMPLETE URL
- If no apply link found, set to null
- Example of COMPLETE URL: "https://email.r.email.encoremusicians.com/mk/cl/f/sh/1t6Af4OhShSDFMvxfqf2K0TFU1/AbCdEfGh12345"`;

    const userPrompt = `FROM: ${clientContact || 'Unknown'}
EMAIL: ${messageText}
JSON:`;

    console.log('🤖 GPT-5 mini: Current date context provided:', currentDate);
    console.log('🤖 GPT-5 mini: System prompt length:', systemPrompt.length);
    console.log('🤖 GPT-5 mini: User prompt:', userPrompt);

    // Prepare AI request for orchestrator
    const aiRequest: AIRequest = {
      systemPrompt,
      userPrompt,
      maxTokens: 4000,
      temperature: 0.1,
      responseFormat: 'json_object'
    };

    // Configure for quality: Use premium models for accurate email parsing
    const taskConfig: TaskConfig = {
      models: ['gpt-4o', 'claude-sonnet-4'], // Start with quality models
      confidenceThreshold: 0.8, // Higher threshold for accuracy
      maxBudgetCents: 50, // Budget allows quality models
      validators: [
        ValidatorFactory.createBookingParser() // Validates JSON structure and required fields
      ],
      scorer: ScorerFactory.createBookingParserScorer() // Confidence scoring based on extracted fields
    };

    console.log('🤖 [AI ORCHESTRATOR] Starting email parsing with escalation system...');
    const startTime = Date.now();
    
    // Use AI orchestrator for intelligent escalation
    const orchestrationResult = await aiOrchestrator.runTask('email-parsing', aiRequest, taskConfig);
    const responseTime = Date.now() - startTime;

    if (!orchestrationResult.success || !orchestrationResult.response) {
      console.error('❌ [AI ORCHESTRATOR] All models failed for email parsing:', orchestrationResult.error);
      console.error('❌ Escalation path:', orchestrationResult.escalationPath);
      console.error('❌ Total cost:', `${orchestrationResult.totalCostCents}¢`);
      throw new Error(`AI orchestrator failed: ${orchestrationResult.error}`);
    }

    const aiResponse = orchestrationResult.response;
    const rawContent = aiResponse.content;

    console.log('🎯 [AI ORCHESTRATOR] Success with', aiResponse.model, 'in', orchestrationResult.attempts, 'attempts');
    console.log('🔍 [AI ORCHESTRATOR] TOKEN USAGE:', {
      model: aiResponse.model,
      inputTokens: aiResponse.inputTokens,
      outputTokens: aiResponse.outputTokens,
      confidence: aiResponse.confidence,
      costCents: orchestrationResult.totalCostCents
    });
    console.log('🤖 [AI ORCHESTRATOR] Response time:', `${responseTime}ms`);
    
    if (!rawContent || rawContent.trim().length === 0) {
      console.error('❌ [AI ORCHESTRATOR] EMPTY RESPONSE from', aiResponse.model);
      throw new Error(`AI orchestrator returned empty response from ${aiResponse.model}`);
    }

    // CRITICAL DEBUG: Log exactly what we sent and received
    console.log('🚨 [CRITICAL DEBUG] AI ORCHESTRATOR RESULT:', {
      finalModel: aiResponse.model,
      escalationPath: orchestrationResult.escalationPath,
      confidence: aiResponse.confidence,
      rawResponse: rawContent,
      responseLength: rawContent.length
    });
    
    // Log input vs output for debugging
    console.log('🔍 [AI ORCHESTRATOR DEBUG] Input Analysis:', {
      fromField: clientContact,
      bodyPreview: messageText.substring(0, 150) + '...',
      hasSignature: messageText.toLowerCase().includes('regards') || messageText.toLowerCase().includes('sincerely'),
      bodyLength: messageText.length
    });
    
    // Simple JSON parsing with robust cleaning
    let jsonContent = rawContent.trim();
    // Remove markdown code blocks if present
    jsonContent = jsonContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').replace(/```$/g, '');
    
    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ [AI ORCHESTRATOR] JSON parse error from', aiResponse.model, ':', parseError);
      console.error('❌ Raw response:', rawContent);
      console.error('❌ Cleaned content:', jsonContent);
      throw new Error(`AI orchestrator returned invalid JSON from ${aiResponse.model} - sending to review queue`);
    }
    
    // Log what the AI extracted
    console.log('🔍 [AI ORCHESTRATOR DEBUG] Extracted Data:', {
      finalModel: aiResponse.model,
      clientName: parsed.clientName,
      fromFieldName: clientContact ? clientContact.split('<')[0].trim() : null,
      nameMatch: parsed.clientName === (clientContact ? clientContact.split('<')[0].trim() : null),
      eventDate: parsed.eventDate,
      confidence: aiResponse.confidence,
      escalationPath: orchestrationResult.escalationPath,
      totalCost: `${orchestrationResult.totalCostCents}¢`,
      fullParsedObject: parsed
    });
    
    // CRITICAL: Log if date is missing
    if (!parsed.eventDate) {
      console.log('❌❌❌ [AI ORCHESTRATOR] FAILED TO EXTRACT DATE FROM:', messageText);
      console.log('❌❌❌ [AI ORCHESTRATOR] FINAL MODEL:', aiResponse.model);
      console.log('❌❌❌ [AI ORCHESTRATOR] RETURNED:', JSON.stringify(parsed));
    }
    
    // POST-PROCESSING VALIDATION: Fix common AI mistakes
    // 1. Check if AI incorrectly used the From field as client name
    const fromFieldName = clientContact ? clientContact.split('<')[0].trim() : null;
    if (parsed.clientName === fromFieldName && messageText) {
      // Look for actual signature in email body
      const signaturePatterns = [
        /(?:kind regards|best regards|regards|sincerely|best wishes|thanks|thank you),?\s*\n+([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)+)/gi,
        /\n([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)+)\s*\n[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        /\n([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)+)\s*\n\d{10,11}/g
      ];
      
      for (const pattern of signaturePatterns) {
        const match = messageText.match(pattern);
        if (match && match[1]) {
          const extractedName = match[1].trim();
          // Make sure it's not "Dear X" or "Hi X"
          if (!messageText.includes(`Dear ${extractedName}`) && !messageText.includes(`Hi ${extractedName}`)) {
            console.log('🔧 [POST-PROCESS] Correcting client name from signature:', extractedName, '(via', aiResponse.model + ')');
            parsed.clientName = extractedName;
            break;
          }
        }
      }
    }
    
    // 2. Last-chance date extraction before sending to review
    if (!parsed.eventDate && messageText) {
      console.log('🔧 [POST-PROCESS]', aiResponse.model, 'missed date, attempting extraction from:', messageText);
      
      const months: Record<string, number> = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
        jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12
      };
      
      // Try multiple date patterns
      const datePatterns = [
        // "September 10th 2025" or "September 10th, 2025"
        /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/gi,
        // "September 10th" or "September 10"
        /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?!\d)/gi,
        // "10th September 2025" or "10th of September 2025"
        /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)\s+(\d{4})/gi,
        // "10th September" or "10th of September"
        /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)(?!\s+\d{4})/gi,
        // Standard formats like "10/09/2025" or "10-09-2025"
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g
      ];
      
      for (const pattern of datePatterns) {
        const matches = [...messageText.matchAll(pattern)];
        console.log(`🔍 Testing pattern ${pattern}, found ${matches.length} matches`);
        if (matches.length > 0) {
          const match = matches[0];
          console.log(`🔍 Match found:`, match[0], 'Groups:', match.slice(1));
          let parsedDate: string | null = null;
          
          // Pattern with year included
          if (match[3] && match[3].length === 4) {
            if (isNaN(Number(match[1]))) {
              // Month name first: "September 10th 2025"
              const monthName = match[1].toLowerCase();
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              if (months[monthName] && day && year) {
                parsedDate = `${year}-${String(months[monthName]).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
            } else {
              // Day first: "10th September 2025"
              const day = parseInt(match[1]);
              const monthName = match[2].toLowerCase();
              const year = parseInt(match[3]);
              if (months[monthName] && day && year) {
                parsedDate = `${year}-${String(months[monthName]).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
            }
          }
          // Pattern without year
          else if (match[1] && match[2]) {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            
            if (isNaN(Number(match[1]))) {
              // Month name first: "September 10th"
              const monthName = match[1].toLowerCase();
              const day = parseInt(match[2]);
              if (months[monthName] && day) {
                let year = currentYear;
                // If the month has passed this year, use next year
                if (months[monthName] < currentMonth || 
                    (months[monthName] === currentMonth && day < new Date().getDate())) {
                  year = currentYear + 1;
                }
                parsedDate = `${year}-${String(months[monthName]).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
            } else {
              // Day first: "10th September"
              const day = parseInt(match[1]);
              const monthName = match[2].toLowerCase();
              if (months[monthName] && day) {
                let year = currentYear;
                // If the month has passed this year, use next year
                if (months[monthName] < currentMonth || 
                    (months[monthName] === currentMonth && day < new Date().getDate())) {
                  year = currentYear + 1;
                }
                parsedDate = `${year}-${String(months[monthName]).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              }
            }
          }
          
          if (parsedDate) {
            console.log('✅ [POST-PROCESS] Successfully extracted date:', parsedDate);
            parsed.eventDate = parsedDate;
            break;
          }
        }
      }
      
      if (!parsed.eventDate) {
        console.log('⚠️ [POST-PROCESS] No date found after all attempts - message will go to review');
      }
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
      travelExpense: cleanNumber(parsed.travelExpense || parsed.travel || parsed.travelCost),
      deposit: cleanNumber(parsed.deposit),
      message: messageText,
      specialRequirements: cleanString(parsed.specialRequirements || parsed.requirements || parsed.notes),
      confidence: Math.min(1.0, Math.max(0.1, parsed.confidence || 0.5))
    };

    // FIRST: Use AI-extracted link if available, otherwise try regex extraction
    if (parsed.applyNowLink && typeof parsed.applyNowLink === 'string' && parsed.applyNowLink.length > 0) {
      const aiExtractedLink = cleanString(parsed.applyNowLink);
      console.log(`🎵 AI extracted Encore apply-now link: ${aiExtractedLink}`);

      // Check if the AI link looks truncated or incomplete
      const looksIncomplete = aiExtractedLink.endsWith('...') ||
                             aiExtractedLink.length < 40 ||
                             !aiExtractedLink.match(/^https?:\/\/.+\/.+/);

      if (looksIncomplete) {
        console.log('⚠️ AI-extracted link appears truncated or incomplete, trying regex extraction...');
        // Try regex extraction for a complete URL
        const regexLink = extractEncoreApplyLink(messageText);
        if (regexLink) {
          cleanedData.applyNowLink = regexLink;
          console.log(`✅ Regex found complete link: ${regexLink}`);
        } else {
          // Use the AI link anyway if regex fails
          cleanedData.applyNowLink = aiExtractedLink;
          console.log(`⚠️ Using potentially incomplete AI link as fallback: ${aiExtractedLink}`);
        }
      } else {
        cleanedData.applyNowLink = aiExtractedLink;
      }
    } else {
      // Fallback to regex extraction if AI didn't find it
      const applyNowLink = extractEncoreApplyLink(messageText);
      if (applyNowLink) {
        cleanedData.applyNowLink = applyNowLink;
        console.log(`🎵 Regex extracted Encore apply-now link: ${cleanedData.applyNowLink}`);
      }
    }

    // Check if this is an Encore booking (now we have applyNowLink)
    const isEncoreBooking = cleanedData.applyNowLink ||
                           messageText.toLowerCase().includes('encore musicians') ||
                           messageText.includes('notification@encoremusicians.com');

    // FORCE ENCORE CLIENT INFO if this is an Encore booking
    if (isEncoreBooking) {
      console.log('🎵 ENCORE BOOKING DETECTED - Setting client to Encore Musicians');
      cleanedData.clientName = 'Encore Musicians';
      cleanedData.clientEmail = 'bookings@encoremusicians.com';
    }

    // For Encore bookings, extract area from title instead of enriching venue
    if (isEncoreBooking && subject) {
      const { extractEncoreArea } = await import('../core/booking-formatter');
      const area = extractEncoreArea(subject);
      
      if (area) {
        console.log(`🎵 Encore booking - using area from title: "${area}"`);
        // For Encore, we don't know the actual venue, just the area - leave venue blank to avoid triggering Google Maps API
        cleanedData.venue = '';  // Leave blank to prevent unnecessary Google Maps API calls
        cleanedData.venueAddress = area;  // Use the area from title
        console.log(`🎵 Set Encore venue blank, area: ${area}`);
      }
    } 
    // Only enrich venue data for non-Encore bookings
    else if (cleanedData.venue && !isEncoreBooking) {
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
    
    // Detect Encore emails even without clickable links (for forwarded emails)
    const isEncoreEmail = messageText.toLowerCase().includes('encore musicians') || 
                         messageText.includes('notification@encoremusicians.com') ||
                         messageText.includes('encoremusicians.com');
    
    if (isEncoreEmail && !cleanedData.applyNowLink) {
      console.log('🎵 Encore email detected but no clickable apply-now link found (likely forwarded email)');
      
      // Extract job ID if present for manual URL construction - try multiple patterns
      const jobIdPatterns = [
        /\[([a-zA-Z0-9]{4,8})\]$/m,  // End of line: [TI7Iw]
        /\[([a-zA-Z0-9]{4,8})\]/g,   // Anywhere: [TI7Iw]
        /job[:\s#]*([a-zA-Z0-9]{4,8})/gi,  // Job: TI7Iw
        /id[:\s#]*([a-zA-Z0-9]{4,8})/gi    // ID: TI7Iw
      ];

      let jobId = null;
      for (const pattern of jobIdPatterns) {
        const jobIdMatch = messageText.match(pattern);
        if (jobIdMatch) {
          jobId = jobIdMatch[1];
          console.log(`🎵 Job ID found with pattern: ${pattern} -> ${jobId}`);
          break;
        }
      }

      if (jobId) {
        console.log(`🎵 Encore job ID extracted: ${jobId}`);
        // Construct the apply link from job ID
        cleanedData.applyNowLink = `https://encoremusicians.com/jobs/${jobId}?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow`;
        console.log(`🎵 Constructed apply link: ${cleanedData.applyNowLink}`);
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

    console.log('🎯 [AI ORCHESTRATOR] Final parsed booking data (via', aiResponse.model + '):', {
      ...cleanedData,
      message: `${messageText.substring(0, 100)}...`
    });

    return cleanedData;

  } catch (error: any) {
    console.error('❌ [AI ORCHESTRATOR] Booking parse error:', error);
    
    // Fallback parsing using simple text analysis
    console.log('🔄 Falling back to simple text analysis...');
    return simpleTextParse(messageText, clientContact, clientAddress);
  }
}

// Extract Encore apply-now links from both plain text and HTML tracking URLs
function extractEncoreApplyLink(messageText: string): string | null {
  console.log('🎵 [ENCORE EXTRACTION] Starting comprehensive apply-now link extraction...');
  console.log('🎵 [ENCORE EXTRACTION] Message length:', messageText?.length || 0);
  console.log('🎵 [ENCORE EXTRACTION] Contains "Apply now":', messageText.toLowerCase().includes('apply now'));
  console.log('🎵 [ENCORE EXTRACTION] Contains "encoremusicians":', messageText.toLowerCase().includes('encoremusicians'));

  // Debug: Check for common Encore email patterns
  if (messageText.toLowerCase().includes('encore')) {
    // Log a sample of text around "Apply" to see the structure
    const applyIndex = messageText.toLowerCase().indexOf('apply');
    if (applyIndex > -1) {
      const snippet = messageText.substring(Math.max(0, applyIndex - 100), Math.min(messageText.length, applyIndex + 300));
      console.log('🎵 [ENCORE EXTRACTION] Sample around "Apply":', snippet.replace(/\s+/g, ' ').substring(0, 200));
    }
  }
  
  // Pattern 1: HTML Button Structures - Target "Apply now" buttons specifically
  const applyNowButtonPatterns = [
    // Direct anchor tag with "Apply now" - capture everything until the closing quote
    /<a[^>]*href=["']([^"']+awstrack\.me[^"']+)["'][^>]*>[\s\S]*?apply\s*now[\s\S]*?<\/a>/gi,
    /<a[^>]*href=["']([^"']+encoremusicians\.com[^"']+)["'][^>]*>[\s\S]*?apply\s*now[\s\S]*?<\/a>/gi,

    // Anchor tag where "Apply now" appears before the link
    /apply\s*now[\s\S]{0,200}?<a[^>]*href=["']([^"']+(?:encoremusicians\.com|awstrack\.me)[^"']+)["'][^>]*>/gi,

    // Table-based buttons (common in email templates)
    /<table[^>]*>[\s\S]*?apply\s*now[\s\S]*?href=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["'][\s\S]*?<\/table>/gi,

    // Div-based buttons with "Apply now" text
    /<div[^>]*>[\s\S]*?apply\s*now[\s\S]*?href=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["'][\s\S]*?<\/div>/gi,

    // Simple pattern for Apply now followed by any link
    /apply\s*now[\s\S]*?href=["']([^"']*(?:encoremusicians\.com|awstrack\.me)[^"']*?)["']/gi,

    // Button elements with "Apply now"
    /<button[^>]*>[\s\S]*?apply\s*now[\s\S]*?href=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["'][\s\S]*?<\/button>/gi,

    // Nested table cells and divs (complex email layouts)
    /<t[dr][^>]*>[\s\S]*?apply\s*now[\s\S]*?href=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["'][\s\S]*?<\/t[dr]>/gi,

    // Links within spans containing "Apply now"
    /<span[^>]*>[\s\S]*?apply\s*now[\s\S]*?href=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["'][\s\S]*?<\/span>/gi,

    // Case insensitive "Apply Now" button text with flexible spacing
    /<a[^>]*href=["']([^"']*(?:encoremusicians\.com|awstrack\.me)[^"']*?)["'][^>]*>[\s\S]*?(?:Apply|APPLY)\s*(?:Now|NOW|now)[\s\S]*?<\/a>/gi
  ];
  
  console.log('🎵 [ENCORE EXTRACTION] Testing', applyNowButtonPatterns.length, 'Apply now button patterns...');
  
  for (let i = 0; i < applyNowButtonPatterns.length; i++) {
    const pattern = applyNowButtonPatterns[i];
    console.log(`🎵 [ENCORE EXTRACTION] Testing pattern ${i + 1}:`, pattern.toString().substring(0, 100) + '...');
    
    let match;
    pattern.lastIndex = 0; // Reset regex state
    while ((match = pattern.exec(messageText)) !== null) {
      const url = match[1];
      console.log(`✅ [ENCORE EXTRACTION] Pattern ${i + 1} found Apply now button URL:`, url);
      
      // Decode tracking URLs
      const decodedUrl = decodeTrackingUrl(url);
      console.log(`🎵 [ENCORE EXTRACTION] Final decoded URL:`, decodedUrl);
      return decodedUrl;
    }
  }
  
  // Pattern 2: Direct encoremusicians.com URLs (fallback)
  console.log('🎵 [ENCORE EXTRACTION] Testing direct URL patterns...');
  const directPatterns = [
    /https:\/\/(?:www\.)?encoremusicians\.com\/[^\s<>"']+/gi,
    /https:\/\/[^\/\s]*\.encoremusicians\.com\/[^\s<>"']+/gi,
    // Also catch URLs that might be in plain text without https
    /(?:www\.)?encoremusicians\.com\/jobs\/[^\s<>"']+/gi
  ];
  
  for (let i = 0; i < directPatterns.length; i++) {
    const pattern = directPatterns[i];
    const match = messageText.match(pattern);
    if (match) {
      console.log(`✅ [ENCORE EXTRACTION] Direct pattern ${i + 1} found URL:`, match[0]);
      return match[0];
    }
  }
  
  // Pattern 3: Enhanced AWS tracking URLs
  console.log('🎵 [ENCORE EXTRACTION] Testing enhanced tracking URL patterns...');
  const trackingPatterns = [
    // Standard AWS tracking patterns
    /https:\/\/[^\/\s]*\.awstrack\.me\/[^\/\s]*\/https:%2F%2Fencoremusicians\.com[^\s<>"']+/gi,
    /https:\/\/[^\/\s]*\.r\.[^\/\s]*\.awstrack\.me\/[^\/\s]*\/https:%2F%2Fencoremusicians\.com[^\s<>"']+/gi,
    
    // Alternative encoding patterns
    /https:\/\/[^\/\s]*\.awstrack\.me\/[^\/\s]*\/https%3A%2F%2Fencoremusicians\.com[^\s<>"']+/gi,
    /https:\/\/[^\/\s]*\.awstrack\.me\/[^\/\s]*\/[^\/\s]*encoremusicians\.com[^\s<>"']+/gi,
    
    // Click tracking services
    /https:\/\/click\.[^\/\s]*\/[^\/\s]*encoremusicians\.com[^\s<>"']+/gi,
    /https:\/\/[^\/\s]*\.clicks\.[^\/\s]*\/[^\/\s]*encoremusicians\.com[^\s<>"']+/gi
  ];
  
  for (let i = 0; i < trackingPatterns.length; i++) {
    const pattern = trackingPatterns[i];
    const match = messageText.match(pattern);
    if (match) {
      const trackingUrl = match[0];
      console.log(`✅ [ENCORE EXTRACTION] Tracking pattern ${i + 1} found URL:`, trackingUrl);
      
      const decodedUrl = decodeTrackingUrl(trackingUrl);
      console.log(`🎵 [ENCORE EXTRACTION] Decoded tracking URL:`, decodedUrl);
      return decodedUrl;
    }
  }
  
  // Pattern 4: Enhanced href attribute extraction
  console.log('🎵 [ENCORE EXTRACTION] Testing enhanced href patterns...');
  const hrefPatterns = [
    // Standard href patterns
    /href=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["']/gi,
    
    // Href with various quotes and encoding
    /href=([^>\s]*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^>\s]*)/gi,
    
    // Data attributes that might contain URLs
    /data-url=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["']/gi,
    /data-link=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["']/gi,
    
    // Action attributes
    /action=["']([^"']*(?:encoremusicians\.com|awstrack\.me.*encoremusicians)[^"']*?)["']/gi
  ];
  
  for (let i = 0; i < hrefPatterns.length; i++) {
    const pattern = hrefPatterns[i];
    let hrefMatch;
    pattern.lastIndex = 0; // Reset regex state
    while ((hrefMatch = pattern.exec(messageText)) !== null) {
      const url = hrefMatch[1];
      console.log(`✅ [ENCORE EXTRACTION] Href pattern ${i + 1} found URL:`, url);
      
      const decodedUrl = decodeTrackingUrl(url);
      if (decodedUrl && decodedUrl.includes('encoremusicians.com')) {
        console.log(`🎵 [ENCORE EXTRACTION] Valid href URL:`, decodedUrl);
        return decodedUrl;
      }
    }
  }
  
  // Pattern 5: Job ID extraction and URL construction (enhanced)
  console.log('🎵 [ENCORE EXTRACTION] Testing job ID extraction patterns...');
  const jobIdPatterns = [
    // Standard job ID patterns
    /\[([A-Za-z0-9]{4,8})\]/g,
    /job[:\s#]*([A-Za-z0-9]{4,8})/gi,
    /id[:\s#]*([A-Za-z0-9]{4,8})/gi,
    
    // URL-style job references
    /\/jobs\/([A-Za-z0-9]{4,8})/gi,
    /job_id=([A-Za-z0-9]{4,8})/gi,
    
    // Email subject patterns
    /encore\s+musicians?\s*[\[\(]?([A-Za-z0-9]{4,8})[\]\)]?/gi
  ];
  
  for (let i = 0; i < jobIdPatterns.length; i++) {
    const pattern = jobIdPatterns[i];
    const jobIdMatch = messageText.match(pattern);
    if (jobIdMatch) {
      const jobId = jobIdMatch[1] || jobIdMatch[0].replace(/[^\w]/g, '');
      if (jobId && jobId.length >= 4 && jobId.length <= 8) {
        console.log(`✅ [ENCORE EXTRACTION] Job ID pattern ${i + 1} found ID:`, jobId);
        const constructedUrl = `https://encoremusicians.com/jobs/${jobId}?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow`;
        console.log(`🎵 [ENCORE EXTRACTION] Constructed URL:`, constructedUrl);
        return constructedUrl;
      }
    }
  }
  
  console.log('❌ [ENCORE EXTRACTION] No apply-now link found after testing all patterns');
  
  // Final debug: Log email structure for analysis
  if (messageText.toLowerCase().includes('encore') || messageText.toLowerCase().includes('apply')) {
    console.log('🔍 [ENCORE EXTRACTION DEBUG] Email appears to be Encore-related but no link found');
    console.log('🔍 [ENCORE EXTRACTION DEBUG] First 500 chars:', messageText.substring(0, 500));
    console.log('🔍 [ENCORE EXTRACTION DEBUG] Contains HTML tags:', messageText.includes('<'));
    console.log('🔍 [ENCORE EXTRACTION DEBUG] Contains URLs:', /https?:\/\//.test(messageText));
  }

  return null;
}

// Helper function to decode various tracking URL formats
function decodeTrackingUrl(url: string): string {
  console.log('🔗 [URL DECODE] Input URL:', url);

  // Handle direct Encore URLs
  if (url.includes('encoremusicians.com') && !url.includes('awstrack.me') && !url.includes('click.')) {
    console.log('🔗 [URL DECODE] Direct Encore URL, returning as-is');
    return url;
  }

  // Handle AWS tracking URLs
  if (url.includes('awstrack.me')) {
    console.log('🔗 [URL DECODE] AWS tracking URL detected');

    // First try: Look for the pattern where the actual URL starts with https%3A%2F%2F or https:%2F%2F
    // and ends with ApplyNow or similar parameter
    const embeddedUrlPattern = /https[:%](?:3A|%3A)?(?:%2F%2F|%2F%2F)encoremusicians[^\/]*(?:%2F|\/)[^\/\s]*ApplyNow/gi;
    const embeddedMatch = url.match(embeddedUrlPattern);
    if (embeddedMatch) {
      console.log('🔗 [URL DECODE] Found embedded URL pattern:', embeddedMatch[0]);
      // Decode the URL-encoded string
      let decoded = decodeURIComponent(embeddedMatch[0]);
      // Clean up any remaining encoding artifacts
      decoded = decoded.replace(/^https:\/+/, 'https://');
      console.log('🔗 [URL DECODE] Successfully decoded embedded URL:', decoded);
      return decoded;
    }

    // Second try: Multiple encoding patterns
    const decodingPatterns = [
      /https:%2F%2Fencoremusicians\.com[^&\s]*ApplyNow/g,
      /https%3A%2F%2Fencoremusicians\.com[^&\s]*ApplyNow/g,
      /https:%2F%2Fencoremusicians\.com[^&\s]*/g,
      /https%3A%2F%2Fencoremusicians\.com[^&\s]*/g,
      /encoremusicians\.com%2Fjobs%2F[^&\s]*/g,
      /encoremusicians\.com[^&\s]*/g
    ];

    for (const pattern of decodingPatterns) {
      const match = url.match(pattern);
      if (match) {
        let decoded = decodeURIComponent(match[0]);
        if (!decoded.startsWith('http')) {
          decoded = 'https://' + decoded;
        }
        console.log('🔗 [URL DECODE] Successfully decoded:', decoded);
        return decoded;
      }
    }

    console.log('🔗 [URL DECODE] Failed to decode AWS tracking URL, returning original');
    return url;
  }
  
  // Handle other click tracking services
  if (url.includes('click.') || url.includes('.clicks.')) {
    console.log('🔗 [URL DECODE] Click tracking service detected');
    
    // Try to extract Encore URL from click tracker
    const encoreMatch = url.match(/encoremusicians\.com[^&\s]*/);
    if (encoreMatch) {
      const decoded = 'https://' + encoreMatch[0];
      console.log('🔗 [URL DECODE] Extracted from click tracker:', decoded);
      return decoded;
    }
  }
  
  console.log('🔗 [URL DECODE] No specific decoding needed, returning original');
  return url;
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
  
  // Match various time formats: HH:MM, H:MM, 7pm, 7:30pm, etc.
  let timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?:\s?(AM|PM))?/i);
  
  // If no colon found, try matching formats like "7pm", "11am"
  if (!timeMatch) {
    timeMatch = timeStr.match(/(\d{1,2})(?:\s?(AM|PM))/i);
    if (timeMatch) {
      // Add :00 for minutes if not specified
      timeMatch[2] = '00';
      timeMatch[3] = timeMatch[2]; // Shift AM/PM to correct position
    }
  }
  
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] || '00';
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

  // Extract venue/location from message - distinguish between venue names and locations
  const locationPatterns = [
    /at ([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i, // "at Brighton Church" (stop at fee)
    /venue:\s*([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i,
    /reception at ([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i,
    /location:\s*([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i,
    /held at ([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i,
    /in ([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i, // "in Glasgow"
    /near ([^£\n]+?)(?:\s+for\s+£|\.|,|$)/i // "near Birmingham"
  ];
  
  for (const pattern of locationPatterns) {
    const locationMatch = messageText.match(pattern);
    if (locationMatch && locationMatch[1].trim().length > 2) {
      const extractedText = locationMatch[1].trim();
      
      // Check if it's likely a proper venue name (has specific venue keywords)
      const venueKeywords = /\b(hall|hotel|club|centre|center|church|school|park|theatre|theater|stadium|arena|pavilion|house|court|lodge|manor|castle|museum|gallery|library|inn|venue|building|restaurant|pub|bar|cafe|room)\b/i;
      
      if (venueKeywords.test(extractedText)) {
        // This looks like an actual venue name
        data.venue = extractedText;
      } else {
        // This looks like a general location - put in venueAddress, leave venue blank
        data.venueAddress = extractedText;
        console.log(`📍 Detected location (not venue): "${extractedText}" - putting in venueAddress`);
      }
      
      data.confidence = Math.min(0.7, data.confidence + 0.2);
      break;
    }
  }

  // Enhanced date extraction with better patterns (most specific first!)
  const datePatterns = [
    /(?:on\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})/i, // "March 15th, 2025" or "March 15th 2025" - MUST BE FIRST!
    /(\d{1,2}\/\d{1,2}\/\d{4})/, // "12/25/2025"
    /(\d{4}-\d{2}-\d{2})/, // "2025-12-25"
    /(?:on\s+)?(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+next year)?)/i // "March 15th next year" - LAST (less specific)
  ];
  
  for (const pattern of datePatterns) {
    const dateMatch = messageText.match(pattern);
    if (dateMatch) {
      let dateStr = dateMatch[1].toLowerCase().trim();
      
      // Handle "next year" conversion
      if (dateStr.includes('next year')) {
        const currentYear = new Date().getFullYear();
        dateStr = dateStr.replace('next year', `${currentYear + 1}`);
      } else if (dateStr.match(/\w+\s+\d{1,2}/) && !dateStr.match(/20\d{2}/)) {
        // If it's just "March 15th" without year, default to next occurrence
        const currentYear = new Date().getFullYear();
        dateStr += ` ${currentYear + 1}`;
      }
      
      // Clean up extra commas, ordinal suffixes, and spaces
      dateStr = dateStr.replace(/,/g, ' ').replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1').replace(/\s+/g, ' ').trim();
      
      try {
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime()) && parsedDate > new Date()) {
          data.eventDate = parsedDate.toISOString().split('T')[0];
          data.confidence = Math.min(0.8, data.confidence + 0.3);
        }
      } catch (e) {
        // Date parsing failed, continue to next pattern
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