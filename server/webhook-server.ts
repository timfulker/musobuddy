import express from 'express';
import { storage } from './storage';

const app = express();
const PORT = process.env.WEBHOOK_PORT || 5001;

// Middleware for webhook processing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`📧 WEBHOOK SERVER: ${req.method} ${req.path}`);
  next();
});

// Mailgun webhook handler
app.post('/api/webhook/mailgun', async (req, res) => {
  console.log('📧 DEDICATED MAILGUN WEBHOOK HANDLER');
  console.log('📧 Body:', req.body);
  
  try {
    const sender = req.body.sender || req.body.from || 'unknown@example.com';
    const subject = req.body.subject || 'Email enquiry';
    const bodyText = req.body['body-plain'] || req.body.text || 'No message content';
    
    // Enhanced email parsing
    let clientName = 'Unknown Client';
    const emailMatch = sender.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch ? emailMatch[0] : sender;
    
    // Extract name from email content or sender
    if (sender.includes('<')) {
      const nameMatch = sender.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim().replace(/['"]/g, '');
      }
    } else {
      clientName = email.split('@')[0].replace(/[._]/g, ' ');
    }
    
    // Parse content for additional details
    const contentLower = bodyText.toLowerCase();
    let eventType = null;
    let venue = null;
    let eventDate = null;
    
    // Event type detection
    if (contentLower.includes('wedding')) eventType = 'Wedding';
    else if (contentLower.includes('corporate')) eventType = 'Corporate Event';
    else if (contentLower.includes('birthday')) eventType = 'Birthday Party';
    else if (contentLower.includes('party')) eventType = 'Party';
    
    // Venue extraction
    const venueMatch = bodyText.match(/(?:at|venue|location)[:\s]+([^.\n]+)/i);
    if (venueMatch) {
      venue = venueMatch[1].trim();
    }
    
    // Date extraction (simple patterns)
    const dateMatch = bodyText.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/);
    if (dateMatch) {
      eventDate = dateMatch[0];
    }
    
    const enquiry = {
      userId: '43963086',
      title: subject,
      clientName: clientName,
      clientEmail: email,
      clientPhone: null,
      eventDate: eventDate,
      eventTime: null,
      eventEndTime: null,
      performanceDuration: null,
      venue: venue,
      eventType: eventType,
      gigType: null,
      estimatedValue: null,
      status: 'new' as const,
      notes: bodyText,
      responseNeeded: true,
      lastContactedAt: null
    };
    
    const newEnquiry = await storage.createEnquiry(enquiry);
    
    console.log('📧 ✅ Enquiry created successfully:', newEnquiry.id);
    
    res.status(200).json({
      success: true,
      message: 'Email processed successfully',
      enquiryId: newEnquiry.id,
      clientName: clientName,
      venue: venue,
      eventType: eventType,
      server: 'dedicated-webhook-server'
    });
    
  } catch (error: any) {
    console.error('📧 Webhook processing error:', error.message);
    res.status(500).json({
      error: 'Failed to process email',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', server: 'webhook-server' });
});

// DISABLED: This duplicate webhook server is causing conflicts
// The main webhook handler is now in server/index.ts
// app.listen(PORT, '0.0.0.0', () => {
//   console.log(`📧 Webhook server running on port ${PORT}`);
//   console.log(`📧 Webhook URL: http://localhost:${PORT}/api/webhook/mailgun`);
// });