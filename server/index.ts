import express, { type Request, Response } from "express";
import { setupVite, serveStatic } from "./vite";
import { serveStaticFixed } from "./static-serve";
import { setupAuthentication } from "./core/auth";
import { registerRoutes } from "./core/routes";
import { storage } from "./core/storage";
import { testDatabaseConnection } from "./core/database";

const app = express();

// Environment validation
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.log('⚠️ Continuing with reduced functionality...');
} else {
  console.log('✅ All required environment variables present');
}

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
    // CRITICAL: Setup authentication FIRST, before any other routes
    await setupAuthentication(app);
    console.log('✅ Authentication system initialized');
    
    // Add critical contract signing route BEFORE Vite middleware to prevent interception
    app.get('/contracts/sign/:id', async (req, res) => {
      console.log('🎯 CONTRACT SIGNING ROUTE HIT (EARLY):', req.params.id);
      try {
        const { storage } = await import('./core/storage.js');
        const contract = await storage.getContract(parseInt(req.params.id));
        
        if (!contract) {
          return res.status(404).send('<h1>Contract not found</h1>');
        }
        
        // If already signed, show success page
        if (contract.status === 'signed') {
          const html = `
<!DOCTYPE html>
<html>
<head><title>Contract Already Signed - ${contract.contractNumber}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; text-align: center; }
  .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; }
  .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: left; }
</style></head>
<body>
  <h1>✅ Contract Already Signed</h1>
  <h2>${contract.contractNumber}</h2>
  <div class="success">
    <h3>This contract has already been signed successfully!</h3>
    <p><strong>Signed by:</strong> ${contract.clientName}</p>
    <p><strong>Signed on:</strong> ${contract.signedAt ? new Date(contract.signedAt).toLocaleString('en-GB') : 'Recently'}</p>
  </div>
  <div class="details">
    <h3>Event Details</h3>
    <p><strong>Client:</strong> ${contract.clientName}</p>
    <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
    <p><strong>Venue:</strong> ${contract.venue}</p>
    <p><strong>Fee:</strong> £${contract.fee}</p>
  </div>
</body>
</html>`;
          return res.send(html);
        }
        
        // Show signing form
        const html = `
<!DOCTYPE html>
<html>
<head><title>Contract Signing - ${contract.contractNumber}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
  .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
  .form { margin: 30px 0; padding: 20px; background: #fff; border: 2px solid #e5e5e5; border-radius: 8px; }
  .sign-button { background: #6366f1; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; }
  input, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin: 5px 0; }
</style></head>
<body>
  <h1>Performance Contract</h1>
  <h2>${contract.contractNumber}</h2>
  
  <div class="details">
    <h3>Event Details</h3>
    <p><strong>Client:</strong> ${contract.clientName}</p>
    <p><strong>Date:</strong> ${new Date(contract.eventDate).toDateString()}</p>
    <p><strong>Venue:</strong> ${contract.venue}</p>
    <p><strong>Fee:</strong> £${contract.fee}</p>
  </div>
  
  <form class="form" onsubmit="signContract(event)">
    <h3>Complete Contract Details & Sign</h3>
    <label>Full Name (for signature):</label>
    <input type="text" id="signatureName" value="${contract.clientName}" required />
    <label>Phone Number:</label>
    <input type="tel" id="clientPhone" value="${contract.clientPhone || ''}" />
    <label>Address:</label>
    <textarea id="clientAddress" rows="3">${contract.clientAddress || ''}</textarea>
    <label><input type="checkbox" id="agreeTerms" required /> I agree to all terms and conditions</label>
    <div style="text-align: center; margin-top: 20px;">
      <button type="submit" class="sign-button">Sign Contract</button>
    </div>
  </form>

  <script>
  function signContract(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      signatureName: document.getElementById('signatureName').value,
      clientPhone: document.getElementById('clientPhone').value || null,
      clientAddress: document.getElementById('clientAddress').value || null,
      agreedToTerms: true,
      signedAt: new Date().toISOString()
    };
    
    form.innerHTML = '<div style="text-align:center;padding:30px;"><h3>Processing signature...</h3></div>';
    
    fetch('https://musobuddy.replit.app/api/contracts/sign/${contract.id}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        document.body.innerHTML = \`
          <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
            <h1 style="color:#28a745;">✅ Contract Signed Successfully</h1>
            <h2>${contract.contractNumber}</h2>
            <p style="font-size:18px;">Thank you!</p>
            <p>Your contract has been successfully signed and saved.</p>
            <p>You will receive a confirmation email shortly.</p>
          </div>
        \`;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    })
    .catch(error => {
      console.error('Signing error:', error);
      form.innerHTML = '<div style="color:red;text-align:center;padding:30px;"><h3>❌ Signing Failed</h3><p>Please try again or contact support.</p><button onclick="location.reload()" class="sign-button">Try Again</button></div>';
    });
  }
  </script>
</body>
</html>`;
        res.send(html);
      } catch (error) {
        console.error('Contract signing route error:', error);
        res.status(500).send('<h1>Error loading contract</h1>');
      }
    });
    
    // Register all routes AFTER authentication
    const server = await registerRoutes(app);
    
    // Add production error handling
    try {
      if (process.env.NODE_ENV === 'production') {
        console.log('🏭 Production mode: serving static files');
        serveStaticFixed(app);
      } else {
        await setupVite(app, server);
        serveStatic(app);
      }
    } catch (error) {
      console.log('⚠️ Static serving setup failed:', error.message);
      
      // Minimal fallback for broken deployments
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          res.status(404).json({ error: 'API endpoint not found' });
        } else {
          res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head><title>MusoBuddy - Server Error</title></head>
            <body>
              <h1>Server Configuration Error</h1>
              <p>The server is having trouble serving static files.</p>
              <p>API is available at /api/ endpoints.</p>
            </body>
            </html>
          `);
        }
      });
    }
    
    // Use environment PORT with fallback
    const port = process.env.PORT || 5000;
    
    server.listen(port, "0.0.0.0", () => {
      console.log(`🚀 MusoBuddy server started on http://0.0.0.0:${port}`);
      console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
      console.log(`📁 Serving from: ${process.env.NODE_ENV === 'production' ? 'dist/public' : 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

startServer();