import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { testDatabaseConnection } from "./db";
import OpenAI from "openai";

const app = express();

// Test database connection at startup
console.log('🔍 Testing database connection...');
testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('✅ Database connection verified successfully');
    } else {
      console.log('⚠️ Database connection failed, but continuing startup...');
    }
  })
  .catch(error => {
    console.error('❌ Database connection test error:', error);
    console.log('⚠️ Continuing startup despite database connection issues...');
  });

// Essential middleware setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));



// Initialize separate OpenAI clients for different functions
const emailParsingAI = process.env.OPENAI_EMAIL_PARSING_KEY ? new OpenAI({ apiKey: process.env.OPENAI_EMAIL_PARSING_KEY }) : null;
const instrumentMappingAI = process.env.OPENAI_INSTRUMENT_MAPPING_KEY ? new OpenAI({ apiKey: process.env.OPENAI_INSTRUMENT_MAPPING_KEY }) : null;
const conflictResolutionAI = process.env.OPENAI_CONFLICT_RESOLUTION_KEY ? new OpenAI({ apiKey: process.env.OPENAI_CONFLICT_RESOLUTION_KEY }) : null;
const supportChatAI = process.env.OPENAI_SUPPORT_CHAT_KEY ? new OpenAI({ apiKey: process.env.OPENAI_SUPPORT_CHAT_KEY }) : null;

console.log('🤖 Email Parsing AI initialized:', !!emailParsingAI);
console.log('🤖 Instrument Mapping AI initialized:', !!instrumentMappingAI);
console.log('🤖 Conflict Resolution AI initialized:', !!conflictResolutionAI);
console.log('🤖 Support Chat AI initialized:', !!supportChatAI);

// Initialize data cleanup service with better error handling
(async () => {
  try {
    console.log('🧹 Initializing data cleanup service...');
    const { dataCleanupService } = await import('./data-cleanup-service');
    await dataCleanupService.initialize();
    console.log('✅ Data cleanup service initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize data cleanup service:', error);
    console.log('⚠️ Continuing without data cleanup service...');
  }
})();

// AI-Enhanced Email Parsing Function
async function parseEmailWithAI(emailBody: string, subject: string): Promise<{
  eventDate: string | null;
  eventTime: string | null;
  venue: string | null;
  eventType: string | null;
  gigType: string | null;
  clientPhone: string | null;
  estimatedValue: string | null;
  applyNowLink: string | null;
}> {
  if (!emailParsingAI) {
    return { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, estimatedValue: null, applyNowLink: null };
  }

  try {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    
    // Pre-process the email body to replace "next year" with the actual year
    const processedBody = emailBody.replace(/next year/gi, `${currentYear + 1}`);
    const processedSubject = subject.replace(/next year/gi, `${currentYear + 1}`);
    
    const prompt = `Parse this email enquiry for a musician/performer and extract structured information. Return JSON only.

Email Subject: "${processedSubject}"
Email Body: "${processedBody}"

CURRENT CONTEXT:
- Today's date: ${new Date().toISOString().split('T')[0]}
- Current year: ${currentYear}
- Current month: ${currentDate.getMonth() + 1}
- Current day: ${currentDate.getDate()}

CRITICAL INSTRUCTIONS FOR ENCORE EMAILS:
1. ENCORE DATE PARSING: Look for date patterns like "Friday 05 Sep 2025" or "Friday\n05\nSep 2025" - convert to YYYY-MM-DD format
2. ENCORE VENUE EXTRACTION: Look for location patterns like "Gwennap, Redruth, Cornwall (TR16)" - extract the full location
3. ENCORE BUDGET: Look for "£260 - £450" or "£260-£450" format in the email
4. ENCORE TIME: Look for time patterns like "3:00pm - 5:00pm" or "Wedding 3:00pm - 5:00pm"
5. ENCORE GIG TYPE: Look for instrument requirements like "Saxophonist needed" or "Saxophonist"
6. ENCORE EVENT TYPE: Look for event types like "wedding drinks reception" or "Wedding"
7. ENCORE APPLY NOW: Extract job ID from subject [E2YY8] and create URL: https://encoremusicians.com/jobs/E2YY8?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow

GENERAL INSTRUCTIONS:
- Find the ACTUAL EVENT DATE - look for "Sunday 24 Aug 2025", "Aug 24", "24 Aug 2025" etc. NOT email send dates like "13 Jul 2025 at 15:42"
- RELATIVE DATE PARSING: For relative dates like "next Saturday", "next Friday", calculate from today's date (${new Date().toISOString().split('T')[0]}) within the current year (${currentYear}) unless explicitly stated otherwise. For "next February" or "next [month]", if the month has already passed this year, use the next year (e.g., "next February" in July 2025 means February 2026).
- Find the ACTUAL VENUE - look for location names like "Bognor Regis", "Brighton", city names, NOT email addresses or timestamps
- Find BUDGET/PRICE information - look for "£260-£450", "£300", price ranges in the email content
- ENCORE DETECTION: Look for "Apply Now" buttons or links - these are typically from Encore booking platform
- ENCORE URL FORMAT: For Encore emails, extract the job ID from the subject line (e.g., [E2YY8], [QuH57], [LM16k]) and create URL: https://encoremusicians.com/jobs/{jobId}?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow. Example: Subject contains [E2YY8] → URL: https://encoremusicians.com/jobs/E2YY8?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow
- REDIRECT URLS: If you find a complete redirect URL starting with https://rbtin183.r.eu-west-1.awstrack.me/, use that instead of constructing a URL.

Extract:
- eventDate: The actual event/performance date in YYYY-MM-DD format (e.g., "Sunday 24 Aug 2025" = "2025-08-24", "14th July 2026" = "2026-07-14")
- eventTime: Start time if mentioned (e.g., "1:00pm - 3:00pm", "7:30pm")
- venue: Location/venue name including city/area (e.g., "Bognor Regis", "Brighton Hotel", "London venue")
- eventType: wedding, birthday, corporate, party, celebration, private event, etc.
- gigType: sax, saxophone, jazz, piano, guitar, dj, band, violin, drums, etc.
- clientPhone: UK phone number if mentioned
- estimatedValue: Budget/price range if mentioned (e.g., "£260-£450", "£300", "budget of £500")
- applyNowLink: If this is an Encore email, look for the job ID in square brackets in the subject line (e.g., [QuH57], [LM16k], [yij5S]) and create this exact URL format: https://encoremusicians.com/jobs/{jobId}?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow. For example, if subject contains [QuH57], return: https://encoremusicians.com/jobs/QuH57?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow. If you find a complete redirect URL starting with https://rbtin183.r.eu-west-1.awstrack.me/, use that instead. Return null if not an Encore email.

Return valid JSON only:`;

    const response = await emailParsingAI.chat.completions.create({
      model: "gpt-3.5-turbo", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: `You are parsing emails in July 2025. When someone says "next year", they mean 2026. Current year is ${currentYear}. Next year is ${currentYear + 1}. For relative dates like "next Saturday", "next Friday", calculate from today's date (${new Date().toISOString().split('T')[0]}) within the current year (${currentYear}) unless explicitly stated otherwise. If the email says "next Saturday" and today is July 13, 2025, "next Saturday" would be July 19, 2025 (not 2026).` 
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.1
    });

    const aiResult = JSON.parse(response.choices[0].message.content || '{}');
    console.log('🤖 AI parsing result:', aiResult);
    return {
      eventDate: aiResult.eventDate || null,
      eventTime: aiResult.eventTime || null,
      venue: aiResult.venue || null,
      eventType: aiResult.eventType || null,
      gigType: aiResult.gigType || null,
      clientPhone: aiResult.clientPhone || null,
      estimatedValue: aiResult.estimatedValue || null,
      applyNowLink: aiResult.applyNowLink || null
    };
  } catch (error) {
    console.log('🤖 AI parsing failed with error:', error);
    console.log('🤖 Using regex fallback');
    return { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, estimatedValue: null, applyNowLink: null };
  }
}

// CRITICAL: REGISTER WEBHOOK ROUTE FIRST, BEFORE ANY OTHER MIDDLEWARE
console.log('🔧 === REGISTERING MAILGUN WEBHOOK FIRST ===');

// Simple test endpoint to verify webhook connectivity
app.post('/api/webhook/test', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  console.log('🔍 TEST WEBHOOK HIT:', new Date().toISOString());
  console.log('🔍 Request body:', req.body);
  console.log('🔍 Request headers:', req.headers);
  res.status(200).json({ success: true, timestamp: new Date().toISOString(), message: 'Test webhook working' });
});

// CLEAN EMAIL FORWARDING WEBHOOK - REGISTERED FIRST FOR PRIORITY
app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  console.log(`📧 [${requestId}] Email webhook received`);
  console.log(`📧 [${requestId}] Request body keys:`, Object.keys(req.body));
  console.log(`📧 [${requestId}] Raw body:`, JSON.stringify(req.body, null, 2));
  
  try {
    // Extract email data with comprehensive field checking
    const fromField = req.body.From || req.body.from || req.body.sender || req.body['from-field'] || '';
    const subjectField = req.body.Subject || req.body.subject || req.body['subject-field'] || '';
    const bodyField = req.body['body-plain'] || req.body['stripped-text'] || req.body.text || req.body.message || req.body.body || '';
    
    console.log(`📧 [${requestId}] From: "${fromField}"`);
    console.log(`📧 [${requestId}] Subject: "${subjectField}"`);
    console.log(`📧 [${requestId}] Body length: ${bodyField.length}`);
    console.log(`📧 [${requestId}] Body content: "${bodyField}"`);
    
    // Check if we have email data
    if (!fromField && !subjectField && !bodyField) {
      console.log(`❌ [${requestId}] No email data found in request`);
      return res.status(400).json({ error: 'No email data found' });
    }
    
    // Extract client email
    let clientEmail = '';
    const emailMatch = fromField.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      clientEmail = emailMatch[0];
    }
    
    // Extract client name
    let clientName = 'Unknown';
    if (fromField.includes('<')) {
      // Format: "John Doe <john@example.com>"
      const nameMatch = fromField.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim();
      }
    } else if (clientEmail) {
      // Use email username as name
      clientName = clientEmail.split('@')[0];
    }
    
    // AI-Only Email Parsing System
    console.log(`📧 [${requestId}] Using AI-only parsing for maximum accuracy and cost efficiency`);
    
    // Use AI to parse all fields from the email
    const aiResult = await parseEmailWithAI(bodyField, subjectField);
    
    // Extract all data from AI results
    const clientPhone = aiResult.clientPhone;
    const eventDate = aiResult.eventDate;
    const venue = aiResult.venue;
    const eventType = aiResult.eventType;
    const gigType = aiResult.gigType;
    const eventTime = aiResult.eventTime;
    const estimatedValue = aiResult.estimatedValue;
    const applyNowLink = aiResult.applyNowLink;
    
    // Log AI-extracted data
    if (clientPhone) console.log(`📧 [${requestId}] AI Phone: ${clientPhone}`);
    if (eventDate) console.log(`📧 [${requestId}] AI Date: ${eventDate}`);
    if (venue) console.log(`📧 [${requestId}] AI Venue: ${venue}`);
    if (eventType) console.log(`📧 [${requestId}] AI Event type: ${eventType}`);
    if (gigType) console.log(`📧 [${requestId}] AI Gig type: ${gigType}`);
    if (eventTime) console.log(`📧 [${requestId}] AI Event time: ${eventTime}`);
    if (estimatedValue) console.log(`📧 [${requestId}] AI Budget: ${estimatedValue}`);
    if (applyNowLink) console.log(`📧 [${requestId}] 🎯 ENCORE Apply Now Link: ${applyNowLink}`);
    
    // Check for conflicts BEFORE creating enquiry (better timing)
    let hasConflicts = false;
    let conflictCount = 0;
    
    if (eventDate) {
      try {
        const { ConflictDetectionService } = await import('./conflict-detection');
        const conflictService = new ConflictDetectionService(storage);
        
        // Create temporary enquiry object for conflict checking
        const tempEnquiry = {
          id: 0, // Will be set after creation
          userId: '43963086',
          title: subjectField || `Email from ${clientName}`,
          clientName,
          clientEmail: clientEmail || null,
          clientPhone: clientPhone || null,
          eventDate: eventDate ? new Date(eventDate) : null,
          eventTime: eventTime,
          eventEndTime: null,
          performanceDuration: null,
          venue,
          venueAddress: null,
          clientAddress: null,
          eventType,
          gigType,
          fee: null,
          equipmentRequirements: null,
          specialRequirements: null,
          estimatedValue: estimatedValue,
          status: 'new' as const,
          notes: bodyField || 'Email enquiry with no body content',
          originalEmailContent: bodyField || null,
          applyNowLink: applyNowLink || null,
          responseNeeded: true,
          lastContactedAt: null,
          hasConflicts: false,
          conflictCount: 0,
          quotedAmount: null,
          depositAmount: null,
          finalAmount: null,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const { conflicts } = await conflictService.checkEnquiryConflicts(tempEnquiry, '43963086');
        
        if (conflicts.length > 0) {
          hasConflicts = true;
          conflictCount = conflicts.length;
          console.log(`⚠️ [${requestId}] CONFLICT DETECTED: ${conflicts.length} conflicts found`);
          console.log(`⚠️ [${requestId}] Conflicts with:`, conflicts.map(c => `${c.type} #${c.id} - ${c.title}`));
        }
      } catch (error) {
        console.error(`❌ [${requestId}] Error checking conflicts:`, error);
      }
    }
    
    // Create enquiry with AI-parsed data AND conflict flags
    const enquiry = {
      userId: '43963086',
      title: subjectField || `Email from ${clientName}`,
      clientName,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      eventDate: eventDate ? new Date(eventDate) : null,
      eventTime: eventTime,
      eventEndTime: null,
      performanceDuration: null,
      venue,
      venueAddress: null,
      clientAddress: null,
      eventType,
      gigType,
      fee: null,
      equipmentRequirements: null,
      specialRequirements: null,
      estimatedValue: estimatedValue,
      status: 'new' as const,
      notes: bodyField || 'Email enquiry with no body content',
      originalEmailContent: bodyField || null,
      applyNowLink: applyNowLink || null,
      responseNeeded: true,
      lastContactedAt: null,
      hasConflicts,
      conflictCount,
      quotedAmount: null,
      depositAmount: null,
      finalAmount: null
    };
    
    console.log(`📧 [${requestId}] Creating enquiry for: ${clientName} (${clientEmail})`);
    console.log(`📧 [${requestId}] Enquiry data:`, JSON.stringify(enquiry, null, 2));
    
    const newEnquiry = await storage.createBooking(enquiry);
    console.log(`✅ [${requestId}] Created booking #${newEnquiry.id}${hasConflicts ? ` (${conflictCount} conflicts detected)` : ''}`);
    
    
    res.status(200).json({
      success: true,
      enquiryId: newEnquiry.id,
      clientName: enquiry.clientName,
      clientEmail: enquiry.clientEmail
    });
    
  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error.message);
    res.status(200).json({ success: false, error: error.message });
  }
});

console.log('✅ Dedicated webhook handler registered');

// STEP 3: REGISTER ALL OTHER ROUTES
console.log('🔧 Starting clean route registration...');

// Initialize the server with error handling
async function initializeServer() {
  let server;
  try {
    server = await registerRoutes(app);
    console.log('✅ All routes registered successfully');
  } catch (error) {
    console.error('❌ Failed to register routes:', error);
    console.log('⚠️ Continuing with basic server setup...');
    const { createServer } = await import('http');
    server = createServer(app);
  }
  return server;
}

const server = await initializeServer();

// Debug: Show all registered routes with error handling
try {
  const routes = app._router.stack.map((middleware: any, index: number) => {
    if (middleware.route) {
      return `${index}: ${Object.keys(middleware.route.methods).join(', ')} ${middleware.route.path}`;
    } else {
      return `${index}: middleware - ${middleware.name || '<anonymous>'}`;
    }
  }).filter(Boolean);

  console.log('🔍 Registered routes:');
  routes.forEach(route => console.log('  ' + route));
} catch (error) {
  console.error('❌ Error listing routes:', error);
  console.log('⚠️ Continuing without route listing...');
}

// STEP 4: SETUP VITE MIDDLEWARE
console.log('🔧 Setting up Vite middleware...');

async function setupMiddleware() {
  try {
    if (app.get('env') === 'development') {
      await setupVite(app, server);
      console.log('✅ Vite middleware set up');
    } else {
      serveStatic(app);
      console.log('✅ Static files served');
    }
    console.log('✅ Vite middleware setup completed');
  } catch (error) {
    console.error('❌ Failed to setup Vite middleware:', error);
    console.log('⚠️ Continuing without Vite middleware...');
  }
}

await setupMiddleware();

// Catch all unmatched routes for debugging
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) {
    console.log(`=== UNMATCHED ROUTE: ${req.method} ${req.path} ===`);
  }
  next();
});

const PORT = Number(process.env.PORT) || 5000;

// Add graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n🔥 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🔥 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.log('⚠️ Attempting to continue...');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('⚠️ Attempting to continue...');
});

// Start the server with error handling
try {
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
    console.log(`🚀 MusoBuddy server started successfully on http://0.0.0.0:${PORT}`);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}