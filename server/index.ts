import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

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
  
  try {
    // Extract email data with comprehensive field checking
    const fromField = req.body.From || req.body.from || req.body.sender || req.body['from-field'] || '';
    const subjectField = req.body.Subject || req.body.subject || req.body['subject-field'] || '';
    const bodyField = req.body['body-plain'] || req.body['stripped-text'] || req.body.text || req.body.message || req.body.body || '';
    
    console.log(`📧 [${requestId}] From: "${fromField}"`);
    console.log(`📧 [${requestId}] Subject: "${subjectField}"`);
    console.log(`📧 [${requestId}] Body length: ${bodyField.length}`);
    
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
    
    // Parse phone numbers from email body
    let clientPhone = null;
    const phonePatterns = [
      /(?:phone|mobile|tel|contact)[\s:]*(?:is|number)[\s:]*([0-9\s\-\(\)]{8,15})/i,
      /(?:call|phone|tel|mobile|contact)[\s:]*(?:me\s+)?(?:on\s+)?([0-9\s\-\(\)]{8,15})/i,
      /\b(0[0-9]\d{8,10})\b/,
      /\b(\+44\s?[0-9\s\-\(\)]{10,15})\b/
    ];
    
    for (const pattern of phonePatterns) {
      const phoneMatch = bodyField.match(pattern);
      if (phoneMatch && phoneMatch[1]) {
        const cleanPhone = phoneMatch[1].replace(/[^\d\+]/g, '');
        if (cleanPhone.length >= 8) {
          clientPhone = phoneMatch[1].trim(); // Keep original formatting
          console.log(`📧 [${requestId}] Phone found: "${clientPhone}"`);
          break;
        }
      }
    }
    
    // Parse event date from email body
    let eventDate = null;
    const datePatterns = [
      /(?:on|for|date|event)[\s:]*([0-9]{1,2}[\s\/\-][0-9]{1,2}[\s\/\-][0-9]{2,4})/i,
      /(?:on|for|date|event)[\s:]*([0-9]{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+[0-9]{2,4})/i,
      /(?:on|for|date|event)[\s:]*([a-z]+\s+[0-9]{1,2}(?:st|nd|rd|th)?\s*,?\s*[0-9]{2,4})/i,
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+[0-9]{1,2}(?:st|nd|rd|th)?/i,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+[0-9]{1,2}(?:st|nd|rd|th)?\s*,?\s*[0-9]{2,4}\b/i,
      /\b[0-9]{1,2}(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+[0-9]{2,4}\b/i
    ];
    
    for (const pattern of datePatterns) {
      const dateMatch = bodyField.match(pattern);
      if (dateMatch) {
        const dateStr = dateMatch[1] || dateMatch[0];
        // Try to parse the date, add current year if missing
        let parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime()) && !dateStr.includes('20')) {
          parsedDate = new Date(dateStr + ', ' + new Date().getFullYear());
        }
        if (!isNaN(parsedDate.getTime())) {
          eventDate = parsedDate.toISOString().split('T')[0];
          console.log(`📧 [${requestId}] Date found: "${dateStr}" -> ${eventDate}`);
          break;
        }
      }
    }
    
    // Parse venue from email body
    let venue = null;
    const venuePatterns = [
      /(?:at|venue|location|place)[\s:]+([^,.!?\n]+?)(?:\s+on|\s+in|\s+for|\.|\n|$)/i,
      /(?:held at|taking place at|located at)[\s:]+([^,.!?\n]+?)(?:\s+on|\s+in|\s+for|\.|\n|$)/i,
      /(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s+on|\s+in|\s+for|\.|\n|$)/g,
      /(?:wedding|event|party|celebration)[\s\w]*?(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s+on|\s+in|\s+for|\.|\n|$)/i
    ];
    
    for (const pattern of venuePatterns) {
      const venueMatch = bodyField.match(pattern);
      if (venueMatch && venueMatch[1]) {
        venue = venueMatch[1].trim();
        console.log(`📧 [${requestId}] Venue found: "${venue}"`);
        break;
      }
    }
    
    // Parse event type from email body
    let eventType = null;
    const eventTypePatterns = [
      /(?:wedding|birthday|corporate|party|celebration|anniversary|graduation|funeral|christmas|new year)/i
    ];
    
    for (const pattern of eventTypePatterns) {
      const typeMatch = bodyField.match(pattern);
      if (typeMatch) {
        eventType = typeMatch[0].toLowerCase();
        break;
      }
    }
    
    // Parse gig type from email body
    let gigType = null;
    const gigTypePatterns = [
      /(?:sax|saxophone|jazz|piano|guitar|dj|band|violin|drums|trumpet|clarinet|flute)/i
    ];
    
    for (const pattern of gigTypePatterns) {
      const gigMatch = bodyField.match(pattern);
      if (gigMatch) {
        gigType = gigMatch[0].toLowerCase();
        break;
      }
    }
    

    
    // Create enquiry with parsed data
    const enquiry = {
      userId: '43963086',
      title: subjectField || `Email from ${clientName}`,
      clientName,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      eventDate,
      eventTime: null,
      eventEndTime: null,
      performanceDuration: null,
      venue,
      eventType,
      gigType,
      estimatedValue: null,
      status: 'new' as const,
      notes: bodyField || 'Email enquiry with no body content',
      responseNeeded: true,
      lastContactedAt: null
    };
    
    console.log(`📧 [${requestId}] Creating enquiry for: ${clientName} (${clientEmail})`);
    console.log(`📧 [${requestId}] Enquiry data:`, JSON.stringify(enquiry, null, 2));
    
    const newEnquiry = await storage.createEnquiry(enquiry);
    console.log(`✅ [${requestId}] Created enquiry #${newEnquiry.id}`);
    
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