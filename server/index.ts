import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

console.log('🔧 === STARTING ROUTE REGISTRATION ===');

// STEP 2: DEDICATED WEBHOOK HANDLER - INTERCEPT BEFORE ALL MIDDLEWARE
app.use('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const timestamp = new Date().toISOString();
  console.log('🔍 === WEBHOOK DATA INSPECTION START ===');
  console.log('🔍 Timestamp:', timestamp);
  
  // Log ALL raw data
  console.log('🔍 RAW REQUEST DATA:');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Content-Type:', req.headers['content-type']);
  
  // Log the complete body
  console.log('🔍 COMPLETE BODY DATA:');
  console.log('Body type:', typeof req.body);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('Full body:', JSON.stringify(req.body, null, 2));
  
  // CRITICAL: Save webhook data to a file for debugging
  const webhookData = {
    timestamp: timestamp,
    headers: req.headers,
    body: req.body,
    method: req.method,
    url: req.url
  };
  
  try {
    const fs = require('fs');
    fs.writeFileSync(`webhook-debug-${Date.now()}.json`, JSON.stringify(webhookData, null, 2));
    console.log('📝 Webhook data saved to file for debugging');
  } catch (e) {
    console.log('📝 Could not save webhook data to file:', e.message);
  }
  
  // Check specific Mailgun fields
  const mailgunFields = [
    'sender', 'From', 'from',
    'recipient', 'To', 'to', 
    'subject', 'Subject',
    'body-plain', 'body-html', 'stripped-text', 'stripped-html',
    'text', 'html',
    'timestamp', 'token', 'signature',
    'message-headers', 'attachments'
  ];
  
  console.log('🔍 MAILGUN FIELD INSPECTION:');
  mailgunFields.forEach(field => {
    const value = req.body[field];
    if (value !== undefined) {
      console.log(`📧 ${field}:`, typeof value === 'string' && value.length > 100 ? 
        `"${value.substring(0, 100)}..."` : value);
    }
  });
  
  try {
    // Enhanced email extraction with ALL possible Mailgun field names including route forwarding
    console.log('🔍 EMAIL EXTRACTION TEST:');
    const extractedEmail = req.body.sender || req.body.From || req.body.from || 
                          req.body['From'] || req.body['sender'] || 
                          req.body['envelope[from]'] || req.body.envelope?.from ||
                          req.body['X-Envelope-From'] || req.body['Return-Path'] ||
                          req.body['Reply-To'] || req.body['reply-to'] || 'NOT_FOUND';
    const extractedSubject = req.body.subject || req.body.Subject || 
                           req.body['Subject'] || req.body['subject'] || 
                           req.body['X-Subject'] || 'NOT_FOUND';
    const extractedText = req.body['body-plain'] || req.body['stripped-text'] || 
                         req.body.text || req.body['body-text'] || 
                         req.body['stripped-text'] || req.body['Text'] || 
                         req.body['body-mime'] || req.body['body-calendar'] ||
                         req.body['stripped-html'] || req.body['body-html'] || 'NOT_FOUND';
    
    console.log('📧 Extracted FROM:', extractedEmail);
    console.log('📧 Extracted SUBJECT:', extractedSubject);
    console.log('📧 Extracted TEXT length:', typeof extractedText === 'string' ? extractedText.length : 'Not string');
    console.log('📧 Extracted TEXT type:', typeof extractedText);
    
    if (extractedText && extractedText !== 'NOT_FOUND') {
      console.log('📧 TEXT SAMPLE (first 200 chars):', extractedText.substring(0, 200));
    }
    
    // Special handling for HTML content when plain text isn't available
    let bodyText = extractedText;
    if (bodyText === 'NOT_FOUND' || !bodyText || bodyText.trim() === '') {
      const htmlContent = req.body['body-html'] || req.body['stripped-html'] || req.body.html || 
                         req.body['body-mime'] || req.body['attachments'] || 'NOT_FOUND';
      if (htmlContent && htmlContent !== 'NOT_FOUND') {
        // Simple HTML to text conversion for basic content extraction
        bodyText = htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
        console.log('📧 Used HTML content, converted to text:', bodyText.substring(0, 100));
      }
    }
    
    // Use the extracted values for processing - DO NOT USE FALLBACK VALUES
    const sender = extractedEmail !== 'NOT_FOUND' ? extractedEmail : null;
    const subject = extractedSubject !== 'NOT_FOUND' ? extractedSubject : null;
    const finalBodyText = bodyText !== 'NOT_FOUND' && bodyText ? bodyText : null;
    
    if (!sender || !finalBodyText) {
      console.log('❌ CRITICAL: Missing essential email data');
      console.log('   Sender:', sender);
      console.log('   Body text:', finalBodyText ? 'Present' : 'Missing');
      return res.status(400).json({ 
        error: 'Missing essential email data',
        received: {
          sender: sender,
          subject: subject,
          bodyText: finalBodyText ? 'Present' : 'Missing'
        }
      });
    }
    
    // Extract email and client name - NEVER use fallback values
    const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch ? emailMatch[0] : sender;
    
    let clientName = null;
    if (sender.includes('<')) {
      const nameMatch = sender.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim().replace(/['"]/g, '');
      }
    } else {
      // Extract from email username part (timfulkermusic@gmail.com -> timfulkermusic)
      const username = email.split('@')[0];
      clientName = username.replace(/[._]/g, ' ');
    }
    
    console.log('📧 Client name extraction:');
    console.log('   - Original sender:', sender);
    console.log('   - Extracted email:', email);
    console.log('   - Extracted client name:', clientName);
    
    // Enhanced parsing for dates, venues, and other details
    const parseEmailContent = (text: string) => {
      const result = {
        phone: null as string | null,
        eventDate: null as string | null,
        eventTime: null as string | null,
        venue: null as string | null,
        eventType: null as string | null,
        gigType: null as string | null,
        clientNameFromBody: null as string | null
      };
      
      // Extract phone numbers
      const phonePatterns = [
        /(?:phone|tel|mobile|cell|contact).*?(\d{5}\s?\d{6})/gi,
        /(?:phone|tel|mobile|cell|contact).*?(\d{4}\s?\d{3}\s?\d{4})/gi,
        /(\d{5}\s?\d{6})/g,
        /(\d{4}\s?\d{3}\s?\d{4})/g
      ];
      
      for (const pattern of phonePatterns) {
        const match = text.match(pattern);
        if (match) {
          result.phone = match[1] || match[0];
          break;
        }
      }
      
      // Extract client name from body ("Best regards, Tim Fulker")
      const namePatterns = [
        /(?:best regards|regards|sincerely|cheers),?\s*([A-Za-z\s]+?)(?:\s+phone|\s+email|\s+mobile|$)/gi,
        /(?:my name is|i'm|i am|this is)\s+([A-Za-z\s]+?)(?:\s+and|\.|\,|$)/gi,
        /(?:name|called):\s*([A-Za-z\s]+?)(?:\s+and|\.|\,|$)/gi
      ];
      
      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          result.clientNameFromBody = match[1].trim();
          break;
        }
      }
      
      // Extract dates (August 15th, 15th August, Aug 15, etc.)
      const datePatterns = [
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/gi,
        /(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)(?:,?\s+(\d{4}))?/gi,
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?/gi,
        /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:,?\s+(\d{4}))?/gi
      ];
      
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          const year = match[3] || '2025';
          result.eventDate = `${match[1]} ${match[2]}, ${year}`;
          break;
        }
      }
      
      // Extract time (2pm, 2:00pm, 14:00, etc.)
      const timePatterns = [
        /(\d{1,2}):?(\d{2})?\s*(am|pm)/gi,
        /(\d{1,2}):(\d{2})/g,
        /(?:at|starts?\s+at|time:?\s*)(\d{1,2}):?(\d{2})?\s*(am|pm)/gi
      ];
      
      for (const pattern of timePatterns) {
        const match = text.match(pattern);
        if (match) {
          result.eventTime = match[0].trim();
          break;
        }
      }
      
      // Extract venue (at The Grand Hotel, venue: Royal Gardens, etc.)
      const venuePatterns = [
        /(?:at|venue:?\s*|location:?\s*|held at)[\s]*([A-Za-z\s]+(?:Hotel|Hall|Centre|Center|Church|Garden|Club|Room|House|Manor|Castle|Barn|Restaurant|Pub|Bar|Venue))/gi,
        /(?:at|venue:?\s*|location:?\s*|held at)[\s]*([A-Za-z\s]+(?:Hotel|Hall|Centre|Center|Church|Garden|Club|Room|House|Manor|Castle|Barn|Restaurant|Pub|Bar|Venue)[A-Za-z\s]*)/gi
      ];
      
      for (const pattern of venuePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          result.venue = match[1].trim();
          break;
        }
      }
      
      // Extract event type (wedding, birthday, corporate, etc.)
      const eventTypePatterns = [
        /(?:for|at|my|a|the)\s+(wedding|birthday|corporate|party|anniversary|celebration|event|function|gig|concert|performance)/gi,
        /(wedding|birthday|corporate|party|anniversary|celebration|event|function|gig|concert|performance)/gi
      ];
      
      for (const pattern of eventTypePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          result.eventType = match[1].toLowerCase();
          break;
        }
      }
      
      // Extract gig type (saxophone, piano, band, etc.)
      const gigTypePatterns = [
        /(?:looking for|need|want|require)\s+a?\s*(saxophone|piano|guitar|violin|band|singer|musician|drummer|bassist|DJ|saxophonist|pianist|guitarist|violinist)\s+(?:player|performance|music)?/gi,
        /(saxophone|piano|guitar|violin|band|singer|musician|drummer|bassist|DJ|saxophonist|pianist|guitarist|violinist)\s+(?:player|performance|music)/gi
      ];
      
      for (const pattern of gigTypePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          result.gigType = match[1].toLowerCase();
          break;
        }
      }
      
      return result;
    };
    
    const parsed = parseEmailContent(finalBodyText);
    
    // Use parsed client name if available, otherwise use email-based name
    const finalClientName = parsed.clientNameFromBody || clientName || 'Client';
    
    console.log('📧 Final client name determination:');
    console.log('   - From email body:', parsed.clientNameFromBody);
    console.log('   - From email address:', clientName);
    console.log('   - Final choice:', finalClientName);
    
    const enquiry = {
      userId: '43963086',
      title: subject,
      clientName: finalClientName,
      clientEmail: email,
      clientPhone: parsed.phone,
      eventDate: parsed.eventDate,
      eventTime: parsed.eventTime,
      eventEndTime: null,
      performanceDuration: null,
      venue: parsed.venue,
      eventType: parsed.eventType,
      gigType: parsed.gigType,
      estimatedValue: null,
      status: 'new' as const,
      notes: finalBodyText,
      responseNeeded: true,
      lastContactedAt: null
    };
    
    const newEnquiry = await storage.createEnquiry(enquiry);
    console.log('📧 ✅ Enquiry created:', newEnquiry.id);
    console.log('📧 🔍 Extracted data:');
    console.log('   - Client Name:', finalClientName);
    console.log('   - Phone:', parsed.phone);
    console.log('   - Event Date:', parsed.eventDate);
    console.log('   - Event Time:', parsed.eventTime);
    console.log('   - Venue:', parsed.venue);
    console.log('   - Event Type:', parsed.eventType);
    console.log('   - Gig Type:', parsed.gigType);
    
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      enquiryId: newEnquiry.id,
      clientName: finalClientName,
      extracted: {
        phone: parsed.phone,
        eventDate: parsed.eventDate,
        eventTime: parsed.eventTime,
        venue: parsed.venue,
        eventType: parsed.eventType,
        gigType: parsed.gigType
      },
      debug: {
        extractedEmail: sender,
        extractedSubject: subject,
        bodyLength: finalBodyText.length,
        timestamp: new Date().toISOString()
      },
      processing: 'enhanced-parser'
    });
    
  } catch (error: any) {
    console.error('📧 Processing error:', error.message);
    res.status(500).json({
      error: 'Webhook processing failed',
      details: error.message
    });
  }
});

console.log('✅ Dedicated webhook handler registered');

// Set up basic middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));

// Test route
app.get('/api/test-route', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') && !req.path.startsWith('/api/webhook')) {
    console.log(`=== UNMATCHED ROUTE: ${req.method} ${req.path} ===`);
  }
  next();
});

// Register all routes
(async () => {
  console.log('🔧 Starting clean route registration...');
  
  try {
    const server = await registerRoutes(app);
    console.log('✅ All routes registered successfully');
    
    // List all registered routes for debugging
    console.log('🔍 Registered routes:');
    app._router.stack.forEach((layer, index) => {
      if (layer.route) {
        console.log(`  ${index}: ${Object.keys(layer.route.methods)} ${layer.route.path}`);
      } else if (layer.name) {
        console.log(`  ${index}: middleware - ${layer.name}`);
      }
    });
    
    // Setup Vite
    if (process.env.NODE_ENV === "development") {
      console.log('🔧 Setting up Vite middleware...');
      await setupVite(app, server);
      console.log('✅ Vite middleware set up');
    } else {
      serveStatic(app);
    }
    
    console.log('✅ Vite middleware setup completed');
    
    // Start server
    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
})();