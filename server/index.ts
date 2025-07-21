import express, { type Request, Response } from "express";
import { setupVite, serveStatic } from "./vite";
import { setupAuthentication } from "./core/auth";
import { registerRoutes } from "./core/routes";
import { storage } from "./core/storage";
import { testDatabaseConnection } from "./core/database";

const app = express();

// Database connection test
console.log('🔍 Testing database connection...');
testDatabaseConnection()
  .then(success => {
    if (success) {
      console.log('✅ Database connection verified');
    } else {
      console.log('⚠️ Database connection failed, continuing...');
    }
  })
  .catch(error => {
    console.error('❌ Database error:', error);
    console.log('⚠️ Continuing despite database issues...');
  });

// Essential middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CRITICAL: Email webhook registered FIRST
app.post('/api/webhook/mailgun', express.urlencoded({ extended: true }), async (req: Request, res: Response) => {
  const requestId = Date.now().toString();
  console.log(`📧 [${requestId}] Email webhook received`);
  
  try {
    const fromField = req.body.From || req.body.from || '';
    const subjectField = req.body.Subject || req.body.subject || '';
    const bodyField = req.body['body-plain'] || req.body.text || '';
    
    if (!fromField && !subjectField && !bodyField) {
      console.log(`❌ [${requestId}] No email data found`);
      return res.status(400).json({ error: 'No email data found' });
    }
    
    // Extract email and name
    let clientEmail = '';
    const emailMatch = fromField.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) clientEmail = emailMatch[0];
    
    let clientName = 'Unknown';
    if (fromField.includes('<')) {
      const nameMatch = fromField.match(/^([^<]+)/);
      if (nameMatch) clientName = nameMatch[1].trim();
    } else if (clientEmail) {
      clientName = clientEmail.split('@')[0];
    }
    
    // AI parsing
    const aiResult = await parseEmailWithAI(bodyField, subjectField);
    
    // Create booking
    const bookingData = {
      userId: "43963086",
      title: subjectField || "New Enquiry",
      clientName,
      clientEmail,
      clientPhone: aiResult.clientPhone,
      eventDate: aiResult.eventDate ? new Date(aiResult.eventDate) : null,
      eventTime: aiResult.eventTime,
      eventEndTime: null,
      performanceDuration: null,
      venue: aiResult.venue,
      venueAddress: null,
      clientAddress: null,
      eventType: aiResult.eventType,
      gigType: aiResult.gigType,
      fee: null,
      equipmentRequirements: null,
      specialRequirements: null,
      estimatedValue: aiResult.estimatedValue,
      status: "new",
      notes: bodyField,
      originalEmailContent: bodyField,
      applyNowLink: aiResult.applyNowLink,
      responseNeeded: true,
      lastContactedAt: null,
      hasConflicts: false,
      conflictCount: 0,
      quotedAmount: null,
      depositAmount: null,
      finalAmount: null
    };
    
    const newBooking = await storage.createBooking(bookingData);
    console.log(`✅ [${requestId}] Created booking #${newBooking.id}`);
    
    res.json({
      success: true,
      enquiryId: newBooking.id,
      clientName,
      clientEmail
    });
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// AI email parsing function
async function parseEmailWithAI(emailBody: string, subject: string): Promise<any> {
  const openai = process.env.OPENAI_EMAIL_PARSING_KEY ? 
    new (await import('openai')).default({ apiKey: process.env.OPENAI_EMAIL_PARSING_KEY }) : null;
    
  if (!openai) {
    return { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, estimatedValue: null, applyNowLink: null };
  }

  try {
    const currentYear = new Date().getFullYear();
    const processedBody = emailBody.replace(/next year/gi, `${currentYear + 1}`);
    
    const prompt = `Extract booking details from this email. Today is ${new Date().toDateString()}.

Email Subject: ${subject}
Email Content: ${processedBody}

Extract in JSON format:
{
  "eventDate": "YYYY-MM-DD or null",
  "eventTime": "HH:MM or null", 
  "venue": "venue name or null",
  "eventType": "wedding/party/corporate/etc or null",
  "gigType": "solo/duo/band/etc or null",
  "clientPhone": "phone number or null",
  "estimatedValue": "amount or null",
  "applyNowLink": "URL or null"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.1
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.log('🤖 AI parsing failed, using fallback');
    return { eventDate: null, eventTime: null, venue: null, eventType: null, gigType: null, clientPhone: null, estimatedValue: null, applyNowLink: null };
  }
}

async function startServer() {
  try {
    // Setup authentication
    await setupAuthentication(app);
    
    // Register all routes
    const server = await registerRoutes(app);
    
    // Setup Vite middleware (with error handling)
    try {
      await setupVite(app, server);
      serveStatic(app);
    } catch (error) {
      console.log('⚠️ Vite setup failed, creating basic static serving:', error.message);
      // Basic fallback static serving
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
          res.send(`<!DOCTYPE html><html><head><title>MusoBuddy</title></head><body><h1>MusoBuddy Server Running</h1><p>API available at /api/</p></body></html>`);
        } else {
          res.status(404).json({ error: 'Not found' });
        }
      });
    }
    
    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 MusoBuddy server started on http://0.0.0.0:${port}`);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();