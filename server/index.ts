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
  
  console.log('📧 MAILGUN WEBHOOK - DEDICATED HANDLER');
  console.log('📧 Request body:', req.body);
  
  try {
    const sender = req.body.sender || req.body.from || 'unknown@example.com';
    const subject = req.body.subject || 'Email enquiry';
    const bodyText = req.body['body-plain'] || req.body.text || 'No message content';
    
    // Extract email and client name
    let clientName = 'Unknown Client';
    const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch ? emailMatch[0] : sender;
    
    if (sender.includes('<')) {
      const nameMatch = sender.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim().replace(/['"]/g, '');
      }
    } else {
      clientName = email.split('@')[0].replace(/[._]/g, ' ');
    }
    
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
      
      // Extract client name from body ("My name is...")
      const namePatterns = [
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
    
    const parsed = parseEmailContent(bodyText);
    
    // Use parsed client name if available, otherwise use email-based name
    const finalClientName = parsed.clientNameFromBody || clientName;
    
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
      notes: bodyText,
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