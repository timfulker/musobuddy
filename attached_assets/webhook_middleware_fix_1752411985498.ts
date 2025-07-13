// Alternative fix: Move webhook BEFORE other middleware in server/index.ts

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

console.log('🔧 === STARTING ROUTE REGISTRATION ===');

// PRIORITY: Register webhook FIRST, before any other middleware
console.log('🔧 Registering webhook handler BEFORE other middleware...');

// ISOLATED MAILGUN WEBHOOK - NO OTHER MIDDLEWARE INTERFERENCE
app.post('/api/webhook/mailgun', express.raw({ type: 'application/x-www-form-urlencoded' }), (req: Request, res: Response) => {
  console.log('📧 ISOLATED WEBHOOK - Raw processing');
  
  try {
    // Parse the raw body manually
    const bodyString = req.body.toString();
    console.log('📧 Raw body string:', bodyString);
    
    // Parse URL-encoded data manually
    const params = new URLSearchParams(bodyString);
    const bodyData: any = {};
    
    for (const [key, value] of params) {
      bodyData[key] = value;
    }
    
    console.log('📧 Parsed body data:', JSON.stringify(bodyData, null, 2));
    
    // Continue with normal processing
    const from = bodyData.From || bodyData.from || bodyData.sender || '';
    const subject = bodyData.Subject || bodyData.subject || '';
    const body = bodyData['body-plain'] || bodyData['stripped-text'] || bodyData.text || '';
    
    console.log('📧 From:', from);
    console.log('📧 Subject:', subject);
    console.log('📧 Body length:', body.length);
    
    // Simple email extraction
    const emailMatch = from.match(/[\w.-]+@[\w.-]+\.\w+/);
    const clientEmail = emailMatch ? emailMatch[0] : from;
    
    let clientName = 'Unknown';
    if (from.includes('<')) {
      const nameMatch = from.match(/^([^<]+)/);
      if (nameMatch) {
        clientName = nameMatch[1].trim();
      }
    } else if (clientEmail) {
      clientName = clientEmail.split('@')[0];
    }
    
    console.log('📧 Extracted email:', clientEmail);
    console.log('📧 Extracted name:', clientName);
    
    // Create enquiry
    const enquiry = {
      userId: '43963086',
      title: subject || `Email enquiry from ${clientName}`,
      clientName,
      clientEmail,
      clientPhone: null,
      eventDate: null,
      eventTime: null,
      eventEndTime: null,
      performanceDuration: null,
      venue: null,
      eventType: null,
      gigType: null,
      estimatedValue: null,
      status: 'new' as const,
      notes: body || 'Email enquiry received',
      responseNeeded: true,
      lastContactedAt: null
    };
    
    console.log('📧 Creating enquiry...');
    
    // Create enquiry asynchronously but don't wait
    storage.createEnquiry(enquiry).then(newEnquiry => {
      console.log('📧 ✅ Enquiry created:', newEnquiry.id);
    }).catch(error => {
      console.log('📧 ❌ Enquiry creation failed:', error.message);
      console.log('📧 ❌ Error details:', error);
    });
    
    // Always return success to Mailgun immediately
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
      clientEmail,
      clientName
    });
    
  } catch (error: any) {
    console.log('📧 ❌ Webhook error:', error.message);
    console.log('📧 ❌ Error stack:', error.stack);
    
    // Still return success to Mailgun
    res.status(200).json({
      success: false,
      error: error.message
    });
  }
});

console.log('✅ Isolated webhook handler registered FIRST');

// CATCH-ALL MIDDLEWARE TO LOG ALL REQUESTS (after webhook)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('webhook')) {
    console.log(`🌐 OTHER WEBHOOK REQUESTS: ${req.method} ${req.path}`);
  }
  next();
});

// Continue with rest of server setup...
// (rest of existing code)
