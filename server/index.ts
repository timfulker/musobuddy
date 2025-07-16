import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import OpenAI from "openai";

const app = express();

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

// Initialize data cleanup service
(async () => {
  try {
    const { dataCleanupService } = await import('./data-cleanup-service');
    await dataCleanupService.initialize();
  } catch (error) {
    console.error('Failed to initialize data cleanup service:', error);
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

CRITICAL INSTRUCTIONS:
1. Find the ACTUAL EVENT DATE - look for "Sunday 24 Aug 2025", "Aug 24", "24 Aug 2025" etc. NOT email send dates like "13 Jul 2025 at 15:42"
2. RELATIVE DATE PARSING: For relative dates like "next Saturday", "next Friday", calculate from today's date (${new Date().toISOString().split('T')[0]}) within the current year (${currentYear}) unless explicitly stated otherwise.
2. Find the ACTUAL VENUE - look for location names like "Bognor Regis", "Brighton", city names, NOT email addresses or timestamps
3. Find BUDGET/PRICE information - look for "£260-£450", "£300", price ranges in the email content
4. ENCORE DETECTION: Look for "Apply Now" buttons or links - these are typically from Encore booking platform
5. ENCORE URL FORMAT: For Encore emails, extract the job ID from the subject line (e.g., [QuH57], [LM16k], [yij5S]) and create URL: https://encoremusicians.com/jobs/{jobId}?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow. Example: Subject contains [QuH57] → URL: https://encoremusicians.com/jobs/QuH57?utm_source=transactional&utm_medium=email&utm_campaign=newJobAlert&utm_content=ApplyNow. NEVER use /job/apply format as it leads to 404 errors.
6. REDIRECT URLS: If you find a complete redirect URL starting with https://rbtin183.r.eu-west-1.awstrack.me/, use that instead of constructing a URL.

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
    console.log('AI parsing failed, using regex fallback');
    return { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, estimatedValue: null, applyNowLink: null };
  }
}

console.log('🔧 === STARTING ROUTE REGISTRATION ===');

// CATCH-ALL MIDDLEWARE TO LOG ALL REQUESTS
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('webhook')) {
    console.log(`🌐 ALL WEBHOOK REQUESTS: ${req.method} ${req.path}`);
    console.log(`🌐 User-Agent: ${req.headers['user-agent']}`);
    console.log(`🌐 Content-Type: ${req.headers['content-type']}`);
  }
  next();
});

// CLEAN EMAIL FORWARDING WEBHOOK
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
          eventDate,
          eventTime: eventTime,
          eventEndTime: null,
          performanceDuration: null,
          venue,
          eventType,
          gigType,
          estimatedValue: estimatedValue,
          status: 'new' as const,
          notes: bodyField || 'Email enquiry with no body content',
          originalEmailContent: bodyField || null,
          applyNowLink: applyNowLink || null,
          responseNeeded: true,
          lastContactedAt: null,
          hasConflicts: false,
          conflictCount: 0,
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
      eventDate,
      eventTime: eventTime,
      eventEndTime: null,
      performanceDuration: null,
      venue,
      eventType,
      gigType,
      estimatedValue: estimatedValue,
      status: 'new' as const,
      notes: bodyField || 'Email enquiry with no body content',
      originalEmailContent: bodyField || null,
      applyNowLink: applyNowLink || null,
      responseNeeded: true,
      lastContactedAt: null,
      hasConflicts,
      conflictCount
    };
    
    console.log(`📧 [${requestId}] Creating enquiry for: ${clientName} (${clientEmail})`);
    console.log(`📧 [${requestId}] Enquiry data:`, JSON.stringify(enquiry, null, 2));
    
    const newEnquiry = await storage.createEnquiry(enquiry);
    console.log(`✅ [${requestId}] Created enquiry #${newEnquiry.id}${hasConflicts ? ` (${conflictCount} conflicts detected)` : ''}`);
    
    
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

// Initialize the server
const server = await registerRoutes(app);

console.log('✅ All routes registered successfully');

// Debug: Show all registered routes
const routes = app._router.stack.map((middleware: any, index: number) => {
  if (middleware.route) {
    return `${index}: ${Object.keys(middleware.route.methods).join(', ')} ${middleware.route.path}`;
  } else {
    return `${index}: middleware - ${middleware.name || '<anonymous>'}`;
  }
}).filter(Boolean);

console.log('🔍 Registered routes:');
routes.forEach(route => console.log('  ' + route));

// STEP 4: SETUP VITE MIDDLEWARE
console.log('🔧 Setting up Vite middleware...');

if (app.get('env') === 'development') {
  await setupVite(app);
  console.log('✅ Vite middleware set up');
} else {
  serveStatic(app);
  console.log('✅ Static files served');
}

console.log('✅ Vite middleware setup completed');

// Catch all unmatched routes for debugging
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) {
    console.log(`=== UNMATCHED ROUTE: ${req.method} ${req.path} ===`);
  }
  next();
});

const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, "0.0.0.0", () => {
  log(`Server running on port ${PORT}`);
});