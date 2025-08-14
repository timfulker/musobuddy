import express from 'express';
import session from 'express-session';
import { Anthropic } from '@anthropic-ai/sdk';

const app = express();

// Basic middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Initialize storage and AI
const { storage } = await import('./core/storage');
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple AI parsing function
async function parseEmailForBooking(emailText: string) {
  try {
    const prompt = `Extract booking information from this email. Return JSON only:

Email: ${emailText}

Return this exact JSON format:
{
  "eventDate": "YYYY-MM-DD or null",
  "eventTime": "HH:MM or null", 
  "venue": "venue name or null",
  "eventType": "wedding/corporate/party/etc or null",
  "clientName": "client name or null",
  "fee": "quoted fee or null"
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0]?.text || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('AI parsing failed:', error);
    return { eventDate: null, eventTime: null, venue: null, eventType: null, clientName: null, fee: null };
  }
}

// Email webhook endpoint
app.post('/api/webhook/mailgun', async (req, res) => {
  try {
    const bodyText = req.body['body-plain'] || req.body.text || '';
    const fromEmail = req.body.From || req.body.from || '';
    const subject = req.body.Subject || req.body.subject || '';
    
    console.log('📧 Processing email:', { from: fromEmail, subject });
    
    // Parse email with AI
    const parsed = await parseEmailForBooking(bodyText);
    console.log('🤖 AI parsed:', parsed);
    
    // Create booking if we have minimum info
    if (parsed.eventDate && parsed.venue) {
      const bookingData = {
        userId: "43963086", // Default admin user
        title: subject || `Booking from ${fromEmail}`,
        clientName: parsed.clientName || fromEmail.split('@')[0] || 'Unknown',
        clientEmail: fromEmail,
        venue: parsed.venue,
        eventDate: new Date(parsed.eventDate),
        eventTime: parsed.eventTime,
        eventType: parsed.eventType,
        fee: parsed.fee,
        status: 'new',
        notes: bodyText
      };
      
      const booking = await storage.createBooking(bookingData);
      console.log('✅ Created booking:', booking.id);
      
      res.json({ success: true, bookingId: booking.id });
    } else {
      console.log('❌ Insufficient data - missing date or venue');
      res.json({ success: false, reason: 'Missing date or venue' });
    }
    
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    res.status(200).json({ success: false, error: error.message });
  }
});

// Register other routes
const { registerRoutes } = await import('./routes');
await registerRoutes(app);

// Start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 5000) : 5000;

if (process.env.NODE_ENV !== 'production') {
  // Development with Vite
  const { setupVite } = await import('./vite');
  const { createServer } = await import('http');
  const server = createServer(app);
  
  await setupVite(app, server);
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Development server running on http://0.0.0.0:${port}`);
  });
} else {
  // Production
  const { serveStaticFixed } = await import('./core/serve-static');
  serveStaticFixed(app);
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Production server running on port ${port}`);
  });
}