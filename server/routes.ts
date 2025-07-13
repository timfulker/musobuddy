import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEnquirySchema, insertContractSchema, insertInvoiceSchema, insertBookingSchema, insertComplianceDocumentSchema, insertEmailTemplateSchema, insertClientSchema } from "@shared/schema";
import { 
  parseAppleCalendar,
  convertEventsToBookings
} from './calendar-import';
import multer from 'multer';
import OpenAI from 'openai';

export async function registerRoutes(app: Express): Promise<Server> {
  // Invoice route now registered in server/index.ts to avoid Vite interference
  
  // Auth middleware setup
  await setupAuth(app);

  // Debug middleware to log all requests
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`🔍 API REQUEST: ${req.method} ${req.path}`);
    }
    next();
  });

  // Test endpoint for Mailgun email sending (no auth for testing)
  app.post('/api/test-email', async (req: any, res) => {
    try {
      const { sendEmail } = await import('./mailgun-email');
      
      const testResult = await sendEmail({
        to: 'test@example.com',
        from: 'MusoBuddy <noreply@sandbox2e23cfec6e14ec6b880912ce39e4926.mailgun.org>',
        subject: 'MusoBuddy Email Test',
        text: 'This is a test email to verify Mailgun integration is working.',
        html: '<h1>Email Test</h1><p>This is a test email to verify Mailgun integration is working.</p>'
      });
      
      res.json({ 
        success: testResult,
        message: testResult ? 'Email sent successfully' : 'Email failed to send'
      });
    } catch (error: any) {
      console.error('Test email error:', error);
      res.status(500).json({ error: 'Failed to send test email' });
    }
  });

  // Mailgun webhook endpoint is now handled directly in index.ts to avoid dynamic import issues

  // PRIORITY ROUTES - These must be registered before Vite middleware
  
  // Test route to debug POST request issue
  app.post('/api/test-post', (req, res) => {
    console.log('🧪 TEST POST ROUTE HIT!');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Body:', req.body);
    res.json({ success: true, method: req.method, url: req.url, body: req.body });
  });

  // Test OpenAI integration
  app.post('/api/test-openai', async (req, res) => {
    try {
      console.log('🤖 Testing OpenAI integration...');
      console.log('🤖 API Key available:', !!process.env.OPENAI_API_KEY);
      
      if (!process.env.OPENAI_API_KEY) {
        return res.json({ error: 'OpenAI API key not available' });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Generate gig types for bagpipes in JSON format with gig_types array.' }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200
      });

      console.log('🤖 OpenAI response:', response.choices[0].message.content);
      res.json({ success: true, response: response.choices[0].message.content });
    } catch (error) {
      console.error('🤖 OpenAI test error:', error);
      res.json({ error: error.message });
    }
  });

  // Gig suggestions endpoint with AI fallback for unknown instruments
  app.post('/api/suggest-gigs', isAuthenticated, async (req, res) => {
    try {
      const { instruments } = req.body;
      
      if (!instruments || !Array.isArray(instruments)) {
        return res.status(400).json({ error: 'Instruments array is required' });
      }

      // Default mappings for known instruments
      const defaultGigMappings = {
        'saxophone': ['Wedding Ceremony Music', 'Jazz Club Performance', 'Corporate Event Entertainment', 'Function Band', 'Sax + DJ', 'Wedding Reception', 'Private Party'],
        'guitar': ['Acoustic Wedding Ceremony', 'Spanish Guitar', 'Classical Guitar', 'Folk Music', 'Singer-Songwriter', 'Acoustic Duo', 'Background Music'],
        'piano': ['Piano Bar', 'Wedding Ceremony', 'Classical Recital', 'Jazz Piano', 'Cocktail Piano', 'Restaurant Background', 'Solo Piano'],
        'vocals': ['Wedding Singer', 'Jazz Vocalist', 'Corporate Entertainment', 'Function Band Vocals', 'Solo Vocalist', 'Tribute Acts', 'Karaoke Host'],
        'dj': ['Wedding DJ', 'Corporate Event DJ', 'Party DJ', 'Club DJ', 'Mobile DJ', 'Sax + DJ', 'Event DJ'],
        'violin': ['Wedding Ceremony', 'String Quartet', 'Classical Performance', 'Folk Violin', 'Electric Violin', 'Background Music', 'Solo Violin'],
        'trumpet': ['Jazz Band', 'Big Band', 'Wedding Fanfare', 'Classical Trumpet', 'Brass Ensemble', 'Mariachi Band', 'Military Ceremony'],
        'drums': ['Function Band', 'Jazz Ensemble', 'Rock Band', 'Wedding Band', 'Corporate Event Band', 'Percussion Solo', 'Session Musician'],
        'bass': ['Function Band', 'Jazz Ensemble', 'Wedding Band', 'Corporate Event Band', 'Session Musician', 'Acoustic Bass', 'Electric Bass'],
        'keyboard': ['Function Band', 'Wedding Ceremony', 'Jazz Piano', 'Corporate Entertainment', 'Solo Keyboard', 'Accompanist', 'Session Musician'],
        'cello': ['Wedding Ceremony', 'String Quartet', 'Classical Performance', 'Solo Cello', 'Chamber Music', 'Background Music', 'Church Music'],
        'flute': ['Wedding Ceremony', 'Classical Performance', 'Jazz Flute', 'Folk Music', 'Solo Flute', 'Wind Ensemble', 'Background Music'],
        'harp': ['Wedding Ceremony', 'Classical Harp', 'Celtic Harp', 'Background Music', 'Solo Harp', 'Church Music', 'Private Events'],
        'trombone': ['Jazz Band', 'Big Band', 'Brass Ensemble', 'Wedding Fanfare', 'Classical Trombone', 'Mariachi Band', 'Military Ceremony'],
        'clarinet': ['Jazz Ensemble', 'Classical Performance', 'Wedding Ceremony', 'Folk Music', 'Solo Clarinet', 'Wind Ensemble', 'Background Music']
      };

      // Collect suggestions from default mappings and database cache
      const allSuggestions = [];
      const unknownInstruments = [];

      for (const instrument of instruments) {
        const normalizedInstrument = instrument.toLowerCase();
        
        // First check if we have cached AI mappings in the database
        const cachedMapping = await storage.getInstrumentMapping(normalizedInstrument);
        if (cachedMapping) {
          console.log('🎵 Using cached mapping for', normalizedInstrument);
          try {
            const cachedTypes = JSON.parse(cachedMapping.gigTypes);
            if (Array.isArray(cachedTypes)) {
              allSuggestions.push(...cachedTypes);
              continue; // Skip to next instrument
            }
          } catch (e) {
            console.error('Error parsing cached gig types:', e);
          }
        }
        
        // Check default mappings
        const gigTypes = defaultGigMappings[normalizedInstrument];
        if (gigTypes) {
          allSuggestions.push(...gigTypes);
          
          // Cache the default mapping for future use
          try {
            await storage.createInstrumentMapping({
              instrument: normalizedInstrument,
              gigTypes: JSON.stringify(gigTypes)
            });
            console.log('🎵 Cached default mapping for', normalizedInstrument);
          } catch (error) {
            console.error('Error caching default mapping:', error);
          }
        } else {
          unknownInstruments.push(instrument);
        }
      }

      // Use OpenAI for unknown instruments if available
      if (unknownInstruments.length > 0 && process.env.OPENAI_API_KEY) {
        try {
          console.log('🤖 OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          console.log('🤖 Calling OpenAI for instruments:', unknownInstruments);

          const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are a music industry expert. Generate SHORT gig type names (2-3 words maximum). Examples: 'Wedding Ceremony', 'Corporate Event', 'Private Party', 'Funeral Service'. Return only a JSON object with a 'gig_types' array."
              },
              {
                role: "user",
                content: `Generate 5-7 gig types for a musician who plays: ${unknownInstruments.join(', ')}. Return ONLY short names (2-3 words), no descriptions.`
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 150
          });

          console.log('🤖 OpenAI response:', response.choices[0].message.content);

          const aiResult = JSON.parse(response.choices[0].message.content);
          console.log('🤖 Parsed AI result:', aiResult);
          
          if (aiResult.gig_types && Array.isArray(aiResult.gig_types)) {
            console.log('🤖 Adding AI suggestions:', aiResult.gig_types);
            // Extract just the type names from the AI response and clean them up
            const gigTypeNames = aiResult.gig_types.map(item => {
              let name = typeof item === 'string' ? item : item.type || item.name || item;
              // Clean up long descriptions by taking only the part before the colon
              if (name.includes(':')) {
                name = name.split(':')[0].trim();
              }
              // Clean up common descriptive phrases
              name = name.replace(/\s*-\s*.*$/, '').trim();
              return name;
            });
            allSuggestions.push(...gigTypeNames);
            
            // Cache the AI-generated mapping in the database
            try {
              await storage.createInstrumentMapping({
                instrument: unknownInstruments.join(',').toLowerCase(),
                gigTypes: JSON.stringify(gigTypeNames)
              });
              console.log('🎵 Cached AI mapping for', unknownInstruments.join(','));
            } catch (error) {
              console.error('Error caching AI mapping:', error);
            }
          } else {
            console.log('🤖 No gig_types array found in AI response');
          }
        } catch (error) {
          console.error('🤖 OpenAI Error:', error);
          console.log('AI suggestions not available for unknown instruments:', unknownInstruments, error.message);
        }
      } else if (unknownInstruments.length > 0) {
        console.log('OpenAI API key not available for unknown instruments:', unknownInstruments);
      }

      // Remove duplicates and sort
      const uniqueSuggestions = [...new Set(allSuggestions)].sort();

      res.json(uniqueSuggestions);

    } catch (error) {
      console.error('Error generating gig suggestions:', error);
      res.status(500).json({ error: 'Failed to generate suggestions' });
    }
  });
  
  // Invoice creation route removed - now handled at top of file to avoid Vite interference

  // REMOVED: SendGrid webhook endpoint - Mailgun-only solution

  // GET endpoint for testing Mailgun webhook connectivity removed to avoid conflicts

  // REMOVED: Debug webhook endpoint - conflicts with main handler

  // REMOVED: Test processing endpoint - conflicts with main handler

  // Public health check endpoint (no auth required)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'MusoBuddy',
      description: 'Music Business Management Platform',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: [
        'Enquiry Management',
        'Digital Contracts',
        'Invoice System',
        'Calendar Integration',
        'Email Forwarding',
        'Address Book'
      ]
    });
  });

  // Public system info endpoint (no auth required)
  app.get('/api/system', (req, res) => {
    res.json({
      name: 'MusoBuddy',
      description: 'Complete business management platform for freelance musicians',
      status: 'operational',
      deployment: 'production',
      authentication: 'Replit OAuth',
      database: 'PostgreSQL',
      features: {
        enquiries: 'Lead management and tracking',
        contracts: 'Digital contract creation and signing',
        invoices: 'Invoice generation with PDF support',
        calendar: 'Booking management and scheduling',
        email: 'Email forwarding and automation',
        clients: 'Address book and client management'
      }
    });
  });

  // Public demo info endpoint (no auth required)
  app.get('/demo', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>MusoBuddy - Demo Information</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 2rem; }
            .header { text-align: center; margin-bottom: 3rem; }
            .feature { margin: 2rem 0; padding: 1.5rem; border-left: 4px solid #6366f1; background: #f8fafc; }
            .status { color: #16a34a; font-weight: bold; }
            .auth-note { background: #fef3c7; padding: 1rem; border-radius: 8px; margin: 2rem 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎵 MusoBuddy</h1>
            <h2>Music Business Management Platform</h2>
            <p class="status">Status: Operational</p>
          </div>
          
          <div class="auth-note">
            <strong>Authentication Required:</strong> This platform uses Replit OAuth for security. 
            Access requires a Replit account and authentication.
          </div>
          
          <div class="feature">
            <h3>📝 Enquiry Management</h3>
            <p>Complete lead tracking from initial contact through booking confirmation. 
            Includes email forwarding system at leads@musobuddy.com for automated enquiry capture.</p>
          </div>
          
          <div class="feature">
            <h3>📋 Digital Contracts</h3>
            <p>Create, send, and manage digital contracts with client signature capture. 
            Professional PDF generation with automated email delivery.</p>
          </div>
          
          <div class="feature">
            <h3>💰 Invoice System</h3>
            <p>Auto-sequenced invoice generation with PDF creation, email delivery, 
            and payment tracking. UK tax compliance built-in.</p>
          </div>
          
          <div class="feature">
            <h3>📅 Calendar Management</h3>
            <p>Booking management with Google Calendar and Apple Calendar sync. 
            Intelligent conflict detection and booking status tracking.</p>
          </div>
          
          <div class="feature">
            <h3>✉️ Email Integration</h3>
            <p>Professional email system with SendGrid integration, 
            automated forwarding, and template management.</p>
          </div>
          
          <div class="feature">
            <h3>👥 Client Management</h3>
            <p>Address book functionality with client contact management 
            and booking history tracking.</p>
          </div>
          
          <p style="text-align: center; margin-top: 3rem;">
            <strong>Technology Stack:</strong> React, TypeScript, Node.js, PostgreSQL, SendGrid
          </p>
        </body>
      </html>
    `);
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Public quick-add endpoint for mobile access (no auth required) - MUST BE FIRST
  app.post('/api/enquiries/quick-add', async (req: any, res) => {
    try {
      console.log("Quick-add endpoint hit with data:", req.body);
      console.log("Request body type:", typeof req.body);
      console.log("Request body keys:", Object.keys(req.body || {}));
      
      // For quick-add, we need to associate with the account owner
      // In a real app, this would be configurable or have a different approach
      const userId = "43963086"; // Your user ID from auth logs
      
      // Transform Quick Add form data to match enquiry schema
      const quickAddData = req.body;
      console.log("Client name from body:", quickAddData.clientName);
      
      const enquiryData = {
        userId,
        title: `Enquiry from ${quickAddData.clientName}`,
        clientName: quickAddData.clientName,
        clientEmail: quickAddData.clientEmail || null,
        clientPhone: quickAddData.clientPhone || null,
        eventDate: quickAddData.eventDate ? new Date(quickAddData.eventDate) : null,
        venue: quickAddData.venue || null,
        estimatedValue: quickAddData.estimatedValue ? quickAddData.estimatedValue.toString() : null,
        notes: quickAddData.notes ? `${quickAddData.notes}\n\nSource: ${quickAddData.source || 'Unknown'}\nContact Method: ${quickAddData.contactMethod || 'Unknown'}\nGig Type: ${quickAddData.gigType || 'Unknown'}` : `Source: ${quickAddData.source || 'Unknown'}\nContact Method: ${quickAddData.contactMethod || 'Unknown'}\nGig Type: ${quickAddData.gigType || 'Unknown'}`,
        status: "new"
      };
      
      console.log("Transformed enquiry data:", enquiryData);
      console.log("estimatedValue type:", typeof enquiryData.estimatedValue);
      console.log("estimatedValue value:", enquiryData.estimatedValue);
      
      // Validate using insertEnquirySchema
      const validatedData = insertEnquirySchema.parse(enquiryData);
      const enquiry = await storage.createEnquiry(validatedData);
      console.log("Quick-add enquiry created:", enquiry);
      res.status(201).json(enquiry);
    } catch (error) {
      console.error("Error creating enquiry via quick-add:", error);
      console.error("Error details:", error.stack);
      res.status(500).json({ message: "Failed to create enquiry", error: error.message });
    }
  });

  // Enquiry routes
  app.get('/api/enquiries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enquiries = await storage.getEnquiries(userId);
      res.json(enquiries);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
      res.status(500).json({ message: "Failed to fetch enquiries" });
    }
  });

  app.get('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const enquiry = await storage.getEnquiry(id, userId);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error) {
      console.error("Error fetching enquiry:", error);
      res.status(500).json({ message: "Failed to fetch enquiry" });
    }
  });

  app.post('/api/enquiries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      // Handle optional numeric fields - convert empty strings to null
      if (data.estimatedValue === '' || data.estimatedValue === undefined) {
        data.estimatedValue = null;
      }
      if (data.clientPhone === '' || data.clientPhone === undefined) {
        data.clientPhone = null;
      }
      if (data.clientEmail === '' || data.clientEmail === undefined) {
        data.clientEmail = null;
      }
      if (data.venue === '' || data.venue === undefined) {
        data.venue = null;
      }
      if (data.eventTime === '' || data.eventTime === undefined) {
        data.eventTime = null;
      }
      if (data.eventEndTime === '' || data.eventEndTime === undefined) {
        data.eventEndTime = null;
      }
      if (data.performanceDuration === '' || data.performanceDuration === undefined) {
        data.performanceDuration = null;
      }
      if (data.notes === '' || data.notes === undefined) {
        data.notes = null;
      }
      
      console.log("Processed enquiry data:", data);
      
      const enquiryData = insertEnquirySchema.parse(data);
      const enquiry = await storage.createEnquiry(enquiryData);
      
      // Check for conflicts after creating enquiry
      const conflictService = new (await import('./conflict-detection')).ConflictDetectionService(storage);
      const { conflicts, analysis } = await conflictService.checkEnquiryConflicts(enquiry, userId);
      
      if (conflicts.length > 0 && analysis) {
        // Save conflict to database for tracking
        await conflictService.saveConflict(userId, enquiry.id, conflicts[0], analysis);
        
        // Return enquiry with conflict information
        res.status(201).json({
          ...enquiry,
          conflict: {
            detected: true,
            severity: analysis.severity,
            conflictsWith: conflicts.length,
            analysis: analysis
          }
        });
      } else {
        res.status(201).json(enquiry);
      }
    } catch (error) {
      console.error("Error creating enquiry:", error);
      res.status(500).json({ message: "Failed to create enquiry" });
    }
  });

  app.patch('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      const enquiry = await storage.updateEnquiry(id, updates, userId);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error) {
      console.error("Error updating enquiry:", error);
      res.status(500).json({ message: "Failed to update enquiry" });
    }
  });

  app.delete('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteEnquiry(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting enquiry:", error);
      res.status(500).json({ message: "Failed to delete enquiry" });
    }
  });

  // Send response to enquiry
  app.post('/api/enquiries/send-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { enquiryId, to, subject, body } = req.body;
      
      // Verify enquiry belongs to user
      const enquiry = await storage.getEnquiry(enquiryId, userId);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }

      // Get user settings for email configuration
      const userSettings = await storage.getUserSettings(userId);
      const fromName = userSettings?.emailFromName || userSettings?.businessName || "MusoBuddy User";
      
      // REMOVED: SendGrid email sending - Mailgun-only solution
      const emailParams = {
        to: to,
        from: `${fromName} <business@musobuddy.com>`,
        replyTo: userSettings?.businessEmail || undefined,
        subject: subject,
        text: body,
        html: body.replace(/\n/g, '<br>')
      };
      
      const success = await sendEmail(emailParams);
      
      if (success) {
        // Update enquiry status to indicate response sent
        await storage.updateEnquiry(enquiryId, { 
          status: 'qualified',
          notes: enquiry.notes ? `${enquiry.notes}\n\n--- Response sent on ${new Date().toLocaleDateString()} ---\nSubject: ${subject}\nMessage: ${body}` : `Response sent on ${new Date().toLocaleDateString()}\nSubject: ${subject}\nMessage: ${body}`
        }, userId);
        
        res.json({ success: true, message: 'Response sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send email response' });
      }
    } catch (error) {
      console.error("Error sending enquiry response:", error);
      res.status(500).json({ message: "Failed to send response" });
    }
  });

  // Email Templates routes
  app.get('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Templates request - userId:', userId);
      const templates = await storage.getEmailTemplates(userId);
      console.log('Templates fetched:', templates.length);
      console.log('Templates data:', templates.map(t => ({ id: t.id, name: t.name, isDefault: t.isDefault })));
      res.json(templates);
    } catch (error) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ message: "Failed to fetch email templates" });
    }
  });

  app.post('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      const templateData = insertEmailTemplateSchema.parse(data);
      const template = await storage.createEmailTemplate(templateData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating email template:", error);
      res.status(500).json({ message: "Failed to create email template" });
    }
  });

  app.patch('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      const template = await storage.updateEmailTemplate(id, updates, userId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error updating email template:", error);
      res.status(500).json({ message: "Failed to update email template" });
    }
  });

  app.delete('/api/templates/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteEmailTemplate(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ message: "Failed to delete email template" });
    }
  });

  // Public contract download route (for signed contracts)
  app.get('/api/contracts/:id/download', async (req, res) => {
    console.log('Public contract download request for contract:', req.params.id);
    
    try {
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        console.log('Contract not found:', contractId);
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Only allow downloading signed contracts
      if (contract.status !== 'signed') {
        console.log('Contract not signed:', contractId, contract.status);
        return res.status(403).json({ message: "Contract must be signed before downloading" });
      }
      
      const userSettings = await storage.getUserSettings(contract.userId);
      
      console.log('Starting PDF generation for contract:', contract.contractNumber);
      
      
      const { generateContractPDF } = await import('./pdf-generator');
      
      const signatureDetails = {
        signedAt: contract.signedAt!,
        signatureName: contract.clientName,
        clientIpAddress: 'Digital signature'
      };
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
      
      console.log('PDF generated successfully:', contract.contractNumber);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber}-Signed.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating contract PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // Contract PDF download route (authenticated)
  app.get('/api/contracts/:id/pdf', isAuthenticated, async (req: any, res) => {
    console.log('Authenticated PDF download request for contract:', req.params.id);
    
    try {
      const userId = req.user.claims.sub;
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        console.log('Contract not found:', contractId);
        return res.status(404).json({ message: "Contract not found" });
      }
      
      const userSettings = await storage.getUserSettings(userId);
      
      console.log('Starting PDF generation for contract:', contract.contractNumber);
      
      
      const { generateContractPDF } = await import('./pdf-generator');
      
      const signatureDetails = contract.signedAt ? {
        signedAt: contract.signedAt,
        signatureName: contract.clientName,
        clientIpAddress: 'Digital signature'
      } : undefined;
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
      
      console.log('PDF generated successfully:', contract.contractNumber);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating contract PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // Public contract PDF download (for clients)
  app.get('/api/contracts/public/:id/pdf', async (req, res) => {
    console.log('Public PDF download request for contract:', req.params.id);
    
    try {
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        console.log('Contract not found:', contractId);
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Only allow PDF download for signed contracts
      if (contract.status !== 'signed') {
        console.log('Contract not signed:', contractId, contract.status);
        return res.status(403).json({ message: "Contract must be signed to download PDF" });
      }
      
      const userSettings = await storage.getUserSettings(contract.userId);
      
      console.log('Starting PDF generation for contract:', contract.contractNumber);
      
      
      const { generateContractPDF } = await import('./pdf-generator');
      
      const signatureDetails = contract.signedAt ? {
        signedAt: contract.signedAt,
        signatureName: contract.clientName,
        clientIpAddress: 'Digital signature'
      } : undefined;
      
      const pdfBuffer = await generateContractPDF(contract, userSettings, signatureDetails);
      
      
      console.log('PDF generated successfully:', contract.contractNumber);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Contract-${contract.contractNumber}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating public contract PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // Invoice PDF download route (authenticated)
  // Invoice PDF endpoint - supports both authenticated and public access
  app.get('/api/invoices/:id/pdf', async (req: any, res) => {
    console.log('PDF request for invoice:', req.params.id);
    
    try {
      const invoiceId = parseInt(req.params.id);
      let invoice = null;
      let userSettings = null;
      let contract = null;

      // Try authenticated access first
      if (req.user && req.user.claims && req.user.claims.sub) {
        const userId = req.user.claims.sub;
        invoice = await storage.getInvoice(invoiceId, userId);
        if (invoice) {
          userSettings = await storage.getUserSettings(userId);
          if (invoice.contractId) {
            contract = await storage.getContract(invoice.contractId, userId);
          }
        }
      }

      // If not found via authenticated access, try public access
      if (!invoice) {
        invoice = await storage.getInvoiceById(invoiceId);
        if (invoice) {
          userSettings = await storage.getUserSettings(invoice.userId);
          if (invoice.contractId) {
            contract = await storage.getContractById(invoice.contractId);
          }
        }
      }

      if (!invoice) {
        console.log('Invoice not found:', invoiceId);
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      console.log('Starting PDF generation for invoice:', invoice.invoiceNumber);
      const { generateInvoicePDF } = await import('./pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);
      console.log('PDF generated successfully:', invoice.invoiceNumber);
      
      // Send PDF for inline viewing (no Content-Disposition header)
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // Public invoice view (no authentication required)
  app.get('/api/invoices/:id/view', async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      // Get invoice with basic validation - no user restriction for public view
      const invoice = await storage.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error('Error fetching invoice for view:', error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Public invoice download (generates PDF for download)
  app.get('/api/invoices/:id/download', async (req, res) => {
    console.log('Public PDF download request for invoice:', req.params.id);
    
    try {
      const invoiceId = parseInt(req.params.id);
      
      // Get invoice and related data
      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice) {
        console.log('Invoice not found:', invoiceId);
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get user settings and contract if available
      const userSettings = await storage.getUserSettings(invoice.userId);
      let contract = null;
      if (invoice.contractId) {
        contract = await storage.getContractById(invoice.contractId);
      }

      console.log('Starting PDF generation for invoice:', invoice.invoiceNumber);
      const { generateInvoicePDF } = await import('./pdf-generator');
      const pdfBuffer = await generateInvoicePDF(invoice, contract, userSettings);
      console.log('PDF generated successfully:', invoice.invoiceNumber);

      // Send PDF as download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate invoice PDF" });
      }
    }
  });



  // Contract routes
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractId = parseInt(req.params.id);
      
      const success = await storage.deleteContract(contractId, userId);
      if (success) {
        res.json({ message: "Contract deleted successfully" });
      } else {
        res.status(404).json({ message: "Contract not found" });
      }
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const contractData = insertContractSchema.parse(data);
      const contract = await storage.createContract(contractData);
      res.status(201).json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  // Invoice route logging (disabled for production)
  // app.use('/api/invoices*', (req, res, next) => {
  //   console.log(`=== INVOICE ROUTE: ${req.method} ${req.originalUrl} ===`);
  //   next();
  // });

  // Test route to verify invoice routes work
  app.post('/api/test-invoice-simple', (req, res) => {
    console.log('=== TEST INVOICE SIMPLE REACHED ===');
    console.log('Request body:', req.body);
    res.json({ message: 'Test invoice endpoint reached', data: req.body });
  });

  // Invoice routes
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      
      const success = await storage.deleteInvoice(invoiceId, userId);
      if (success) {
        res.json({ message: "Invoice deleted successfully" });
      } else {
        res.status(404).json({ message: "Invoice not found" });
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });



  // Debug route to check user session
  app.get('/api/debug-user', isAuthenticated, (req: any, res) => {
    console.log('DEBUG USER ROUTE REACHED');
    res.json({
      user: req.user,
      userId: req.userId,
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID
    });
  });

  // Update invoice
  app.patch('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    console.log('=== INVOICE UPDATE REQUEST RECEIVED ===');
    try {
      const userId = req.userId || req.user?.id; // Use the properly stored user ID
      const invoiceId = parseInt(req.params.id);
      
      console.log('Invoice ID:', invoiceId, 'User ID:', userId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      if (!userId) {
        console.log('ERROR: No user ID available');
        return res.status(401).json({ message: "User ID not available" });
      }
      console.log('User ID:', userId);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      // First, let's verify the invoice exists and belongs to the user
      const existingInvoice = await storage.getInvoice(invoiceId, userId);
      if (!existingInvoice) {
        console.log('Invoice not found or does not belong to user');
        return res.status(404).json({ message: "Invoice not found" });
      }
      console.log('Existing invoice found:', existingInvoice.invoiceNumber);
      
      // Process the update data with minimal validation to isolate the issue
      const updateData = { ...req.body };
      
      // Basic validation - only check what's absolutely required
      if (!updateData.clientName) {
        console.log('Missing client name');
        return res.status(400).json({ message: "Client name is required" });
      }
      if (!updateData.amount) {
        console.log('Missing amount');
        return res.status(400).json({ message: "Amount is required" });
      }
      
      if (updateData.dueDate && typeof updateData.dueDate === 'string') {
        updateData.dueDate = new Date(updateData.dueDate);
      }
      if (updateData.performanceDate && typeof updateData.performanceDate === 'string') {
        updateData.performanceDate = new Date(updateData.performanceDate);
      }
      
      // Ensure decimal fields are properly formatted
      if (updateData.amount && typeof updateData.amount === 'string') {
        updateData.amount = updateData.amount;  // Keep as string for Drizzle decimal handling
      }
      if (updateData.performanceFee && typeof updateData.performanceFee === 'string') {
        updateData.performanceFee = updateData.performanceFee;
      }
      if (updateData.depositPaid && typeof updateData.depositPaid === 'string') {
        updateData.depositPaid = updateData.depositPaid;
      }
      
      // Handle empty strings and null values properly for optional fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        } else if (updateData[key] === '' && (key === 'clientEmail' || key === 'clientAddress' || key === 'venueAddress' || key === 'performanceDate' || key === 'performanceFee' || key === 'depositPaid')) {
          updateData[key] = null; // Set optional fields to null instead of empty string
        }
      });
      
      // Don't allow updates to system-generated fields
      delete updateData.id;
      delete updateData.invoiceNumber;
      delete updateData.createdAt;
      delete updateData.updatedAt;
      
      console.log('About to call storage.updateInvoice with:', { invoiceId, userId, updateData });
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, updateData, userId);
      console.log('Storage returned:', updatedInvoice ? 'Success' : 'Not found');
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error("=== INVOICE UPDATE ERROR ===");
      console.error("Error message:", error.message);
      console.error("Error name:", error.name);
      console.error("Error code:", error.code);
      console.error("Error stack:", error.stack);
      console.error("Invoice ID:", invoiceId);
      console.error("User ID:", userId);
      console.error("Request body:", JSON.stringify(req.body, null, 2));
      res.status(500).json({ message: "Failed to update invoice", error: error.message, details: error.stack });
    }
  });

  // Debug endpoint without authentication to test raw update
  app.post('/api/debug-invoice-update', async (req: any, res) => {
    try {
      console.log('=== DEBUG INVOICE UPDATE ===');
      
      const testData = {
        contractId: null,
        clientName: "Pat Davis Updated",
        clientEmail: "timfulker@gmail.com",
        clientAddress: "291, Alder Road, Poole",
        venueAddress: "Langham House, Rode, Frome BA11 6PS",
        amount: "300.00",
        dueDate: new Date("2025-07-05T00:00:00.000Z"),
        performanceDate: new Date("2025-07-05T00:00:00.000Z"),
        performanceFee: "300.00",
        depositPaid: "0.00"
      };
      
      console.log('Test data:', JSON.stringify(testData, null, 2));
      
      const result = await storage.updateInvoice(47, testData, '43963086');
      console.log('Debug update result:', result);
      
      res.json({ success: true, result });
    } catch (error) {
      console.error('=== DEBUG UPDATE ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error name:', error.name);
      console.error('Error code:', error.code);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });

  // Test endpoint for debugging invoice updates
  app.post('/api/test-invoice-update', async (req: any, res) => {
    try {
      console.log('TEST INVOICE UPDATE ENDPOINT REACHED');
      
      // Test 1: Basic database read
      const existingInvoice = await storage.getInvoice(47, '43963086');
      console.log('Existing invoice:', existingInvoice?.invoiceNumber);
      
      if (!existingInvoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      // Test 2: Simple field update
      const simpleData = {
        clientName: 'Test Client Updated'
      };
      
      const result = await storage.updateInvoice(47, simpleData, '43963086');
      console.log('Simple update result:', result?.invoiceNumber);
      
      res.json({ success: true, result });
    } catch (error) {
      console.error('Test update error:', error);
      res.status(500).json({ error: error.message, stack: error.stack });
    }
  });



  // Send invoice email
  app.post('/api/invoices/send-email', isAuthenticated, async (req: any, res) => {
    try {

      const userId = req.user.claims.sub;
      const { invoiceId } = req.body;
      
      // Get the invoice details
      const invoice = await storage.getInvoice(invoiceId, userId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get client email from invoice or related contract
      let clientEmail = invoice.clientEmail;
      let contract = null;
      
      if (!clientEmail && invoice.contractId) {
        contract = await storage.getContract(invoice.contractId, userId);
        clientEmail = contract?.clientEmail;
      }

      // Get user settings for business details
      const userSettings = await storage.getUserSettings(userId);

      if (!clientEmail) {
        return res.status(400).json({ message: "Client email not found. Please add client email to the invoice or contract." });
      }

      // First update invoice status to sent
      const updatedInvoice = await storage.updateInvoice(invoiceId, { status: "sent" }, userId);
      if (!updatedInvoice) {
        return res.status(404).json({ message: "Failed to update invoice status" });
      }

      // REMOVED: SendGrid import - Mailgun-only solution
      
      // Generate invoice view link
      const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const invoiceViewUrl = `https://${currentDomain}/view-invoice/${updatedInvoice.id}`;
      const invoiceDownloadUrl = `https://${currentDomain}/api/invoices/${updatedInvoice.id}/download`;
      
      console.log('=== SENDING INVOICE EMAIL WITH LINK ===');
      console.log('Invoice view URL:', invoiceViewUrl);
      console.log('Invoice download URL:', invoiceDownloadUrl);
      
      // Smart email handling - use authenticated domain for sending, Gmail for replies
      const userBusinessEmail = userSettings?.businessEmail;
      const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
      
      // Always use authenticated domain for FROM to avoid SPF issues
      const fromEmail = 'noreply@musobuddy.com';
      
      // If user has Gmail (or other non-authenticated domain), use it as reply-to
      const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
      
      console.log('=== EMAIL DETAILS ===');
      console.log('To:', clientEmail);
      console.log('From:', `${fromName} <${fromEmail}>`);
      console.log('Reply-To:', replyToEmail);
      console.log('Subject:', `Invoice ${updatedInvoice.invoiceNumber} from ${fromName}`);
      
      const emailData: any = {
        to: clientEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: `Invoice ${updatedInvoice.invoiceNumber} from ${fromName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0EA5E9; margin-bottom: 20px;">Invoice ${updatedInvoice.invoiceNumber}</h1>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p><strong>Amount:</strong> £${updatedInvoice.amount}</p>
              <p><strong>Due Date:</strong> ${new Date(updatedInvoice.dueDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Client:</strong> ${updatedInvoice.clientName}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invoiceViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Invoice Online</a>
            </div>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${invoiceDownloadUrl}" style="background: #6B7280; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; display: inline-block;">Download PDF</a>
            </div>
            <p>Thank you for your business!</p>
            <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
              <small>Powered by MusoBuddy – less admin, more music</small>
            </p>
          </div>
        `,
        text: `Invoice ${updatedInvoice.invoiceNumber}. Amount: £${updatedInvoice.amount}. Due date: ${new Date(updatedInvoice.dueDate).toLocaleDateString('en-GB')}. View your invoice online: ${invoiceViewUrl} or download PDF: ${invoiceDownloadUrl}`
      };
      
      // Add reply-to if user has Gmail or other external email
      if (replyToEmail) {
        emailData.replyTo = replyToEmail;
      }
      
      const emailSent = false; // Email sending disabled - rebuilding

      if (emailSent) {
        console.log(`Invoice ${updatedInvoice.invoiceNumber} sent successfully to ${clientEmail}`);
        res.json({ 
          message: "Invoice sent successfully via email",
          debug: {
            invoiceId: invoiceId,
            clientEmail: clientEmail,
            invoiceNumber: updatedInvoice.invoiceNumber,
            emailSent: true
          }
        });
      } else {
        // If email failed, revert status back to draft
        await storage.updateInvoice(invoiceId, { status: "draft" }, userId);
        res.status(500).json({ 
          message: "Failed to send email. Please check your email settings.",
          debug: {
            invoiceId: invoiceId,
            clientEmail: clientEmail,
            invoiceNumber: updatedInvoice.invoiceNumber,
            emailSent: false
          }
        });
      }
    } catch (error: any) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ 
        message: "Failed to send invoice email", 
        error: error.message || "Unknown error",
        debug: { invoiceId: req.body.invoiceId }
      });
    }
  });

  // Send contract email
  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contractId } = req.body;
      
      // Get the contract details
      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Get user settings for business details
      const userSettings = await storage.getUserSettings(userId);

      if (!contract?.clientEmail) {
        return res.status(400).json({ message: "Client email not found. Please add client email to the contract." });
      }

      // REMOVED: SendGrid functions - Mailgun-only solution
      
      // Generate contract signing link instead of PDF attachment
      const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
      const contractSignUrl = `https://${currentDomain}/sign-contract/${contract.id}`;
      const contractViewUrl = `https://${currentDomain}/view-contract/${contract.id}`;
      
      console.log('=== SENDING CONTRACT EMAIL WITH SIGNING LINK ===');
      console.log('Contract sign URL:', contractSignUrl);
      console.log('Contract view URL:', contractViewUrl);
      
      // Smart email handling - use authenticated domain for sending, Gmail for replies
      const userBusinessEmail = userSettings?.businessEmail;
      const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
      
      // Always use authenticated domain for FROM to avoid SPF issues
      const fromEmail = 'noreply@musobuddy.com';
      
      // If user has Gmail (or other non-authenticated domain), use it as reply-to
      const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
      
      console.log('=== CONTRACT EMAIL DETAILS ===');
      console.log('To:', contract.clientEmail);
      console.log('From:', `${fromName} <${fromEmail}>`);
      console.log('Reply-To:', replyToEmail);
      console.log('Subject:', `Performance Contract ${contract.contractNumber} from ${fromName}`);
      
      const emailData: any = {
        to: contract.clientEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: `Performance Contract ${contract.contractNumber} from ${fromName} - Please Sign`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0EA5E9; margin-bottom: 20px;">Performance Contract ${contract.contractNumber}</h1>
            
            <p>Dear ${contract.clientName},</p>
            <p>Please find your performance contract ready for signing.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Event Details</h3>
              <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Time:</strong> ${contract.eventTime}</p>
              <p><strong>Venue:</strong> ${contract.venue}</p>
              <p><strong>Fee:</strong> £${contract.fee}</p>
              <p><strong>Deposit:</strong> £${contract.deposit}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractSignUrl}" style="background: #0EA5E9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Sign Contract Online</a>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${contractViewUrl}" style="background: #6B7280; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px; display: inline-block;">View Contract Details</a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">
              By clicking "Sign Contract Online" you'll be taken to a secure page where you can review and digitally sign the contract. No downloads or printing required.
            </p>
            
            <p>Thank you for choosing our services!</p>
            <p>Best regards,<br><strong>${userSettings?.businessName || fromName}</strong></p>
            
            <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
              <small>Powered by MusoBuddy – less admin, more music</small>
            </p>
          </div>
        `,
        text: `Performance Contract ${contract.contractNumber}. Event: ${new Date(contract.eventDate).toLocaleDateString('en-GB')} at ${contract.venue}. Fee: £${contract.fee}. Sign online: ${contractSignUrl}`
      };
      
      // Add reply-to if user has Gmail or other external email
      if (replyToEmail) {
        emailData.replyTo = replyToEmail;
      }
      
      const emailSent = false; // Email sending disabled - rebuilding

      if (emailSent) {
        // Update contract status to sent
        await storage.updateContract(contractId, { status: "sent" }, userId);
        console.log(`Contract ${contract.contractNumber} sent successfully to ${contract.clientEmail}`);
        res.json({ message: "Contract sent successfully via email" });
      } else {
        res.status(500).json({ message: "Failed to send email. Please check your email settings." });
      }
    } catch (error) {
      console.error("Error sending contract email:", error);
      res.status(500).json({ message: "Failed to send contract email" });
    }
  });

  // Public contract routes for signing (no authentication required)
  app.get('/api/contracts/public/:id', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      // Get contract without user authentication
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Only return contracts that are sent (ready for signing) or already signed (for confirmation)
      if (contract.status !== 'sent' && contract.status !== 'signed') {
        return res.status(404).json({ message: "Contract not available for signing" });
      }
      
      res.json(contract);
    } catch (error) {
      console.error("Error fetching public contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.get('/api/settings/public/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const settings = await storage.getUserSettings(userId);
      
      // Return only business-facing settings for contract display
      const publicSettings = settings ? {
        businessName: settings.businessName,
        businessEmail: settings.businessEmail,
        businessAddress: settings.businessAddress,
        phone: settings.phone,
        website: settings.website
      } : null;
      
      res.json(publicSettings);
    } catch (error) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/contracts/sign/:id', async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { signatureName } = req.body;
      
      if (!signatureName || !signatureName.trim()) {
        return res.status(400).json({ message: "Signature name is required" });
      }
      
      // Get contract
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      if (contract.status !== 'sent') {
        return res.status(400).json({ message: "Contract is not available for signing" });
      }
      
      // Get client IP for audit trail
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Update contract with signature
      const signedContract = await storage.signContract(contractId, {
        signatureName: signatureName.trim(),
        clientIP,
        signedAt: new Date()
      });
      
      if (!signedContract) {
        return res.status(500).json({ message: "Failed to sign contract" });
      }
      
      // Send confirmation emails with download links (no PDF generation)
      try {
        const userSettings = await storage.getUserSettings(contract.userId);
        // Email sending disabled - clean slate rebuild
        
        // Generate contract download links
        const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
        const contractDownloadUrl = `https://${currentDomain}/api/contracts/${signedContract.id}/download`;
        const contractViewUrl = `https://${currentDomain}/view-contract/${signedContract.id}`;
        
        // Smart email handling - use authenticated domain for sending, Gmail for replies
        const userBusinessEmail = userSettings?.businessEmail;
        const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
        
        // Always use authenticated domain for FROM to avoid SPF issues
        const fromEmail = 'noreply@musobuddy.com';
        
        // If user has Gmail (or other non-authenticated domain), use it as reply-to
        const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
        
        console.log('=== CONTRACT SIGNING CONFIRMATION EMAIL ===');
        console.log('To:', contract.clientEmail);
        console.log('From:', `${fromName} <${fromEmail}>`);
        console.log('Reply-To:', replyToEmail);
        console.log('Contract download URL:', contractDownloadUrl);
        console.log('Contract view URL:', contractViewUrl);
        
        // Email to client with download link
        const clientEmailData: any = {
          to: contract.clientEmail,
          from: `${fromName} <${fromEmail}>`,
          subject: `Contract ${contract.contractNumber} Successfully Signed ✓`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
              
              <p>Dear ${contract.clientName},</p>
              <p>Your performance contract <strong>${contract.contractNumber}</strong> has been successfully signed!</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> ${contract.eventTime}</p>
                <p><strong>Venue:</strong> ${contract.venue}</p>
                <p><strong>Fee:</strong> £${contract.fee}</p>
                <p><strong>Signed by:</strong> ${signatureName.trim()}</p>
                <p><strong>Signed on:</strong> ${new Date().toLocaleString('en-GB')}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${contractViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
                <a href="${contractDownloadUrl}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px;">
                Your signed contract is ready for download at any time. We look forward to performing at your event!
              </p>
              
              <p>Best regards,<br><strong>${userSettings?.businessName || fromName}</strong></p>
              
              <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                <small>Powered by MusoBuddy – less admin, more music</small>
              </p>
            </div>
          `,
          text: `Contract ${contract.contractNumber} successfully signed by ${signatureName.trim()}. Event: ${new Date(contract.eventDate).toLocaleDateString('en-GB')} at ${contract.venue}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
        };
        
        // Add reply-to if user has Gmail or other external email
        if (replyToEmail) {
          clientEmailData.replyTo = replyToEmail;
        }
        
        await sendEmail(clientEmailData);
        
        // Email to performer (business owner) with download link
        if (userSettings?.businessEmail) {
          const performerEmailData: any = {
            to: userSettings.businessEmail,
            from: `${fromName} <${fromEmail}>`,
            subject: `Contract ${contract.contractNumber} Signed by Client ✓`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed! ✓</h2>
                
                <p>Great news! Contract <strong>${contract.contractNumber}</strong> has been signed by ${contract.clientName}.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                  <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
                  <p><strong>Time:</strong> ${contract.eventTime}</p>
                  <p><strong>Venue:</strong> ${contract.venue}</p>
                  <p><strong>Fee:</strong> £${contract.fee}</p>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196F3; margin: 20px 0;">
                  <p style="margin: 0;"><strong>Signature Details:</strong></p>
                  <p style="margin: 5px 0;">Signed by: ${signatureName.trim()}</p>
                  <p style="margin: 5px 0;">Time: ${new Date().toLocaleString('en-GB')}</p>
                  <p style="margin: 5px 0;">IP: ${clientIP}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${contractViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
                  <a href="${contractDownloadUrl}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
                </div>
                
                <p style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
                  📋 <strong>The signed contract is ready for download when needed.</strong>
                </p>
                
                <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                  <small>Powered by MusoBuddy – less admin, more music</small>
                </p>
              </div>
            `,
            text: `Contract ${contract.contractNumber} signed by ${signatureName.trim()} on ${new Date().toLocaleString('en-GB')}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
          };
          
          // Add reply-to for performer email too
          if (replyToEmail) {
            performerEmailData.replyTo = replyToEmail;
          }
          
          await sendEmail(performerEmailData);
        }
      } catch (emailError) {
        console.error("Error sending confirmation emails:", emailError);
        // Don't fail the signing process if email fails
      }
      
      res.json({ 
        message: "Contract signed successfully",
        contract: signedContract 
      });
      
    } catch (error) {
      console.error("Error signing contract:", error);
      res.status(500).json({ message: "Failed to sign contract" });
    }
  });

  // Invoice management routes
  app.post('/api/invoices/:id/mark-paid', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      const { paidDate } = req.body;
      
      const { invoiceManager } = await import('./invoice-manager');
      const success = await invoiceManager.markInvoiceAsPaid(invoiceId, userId, paidDate ? new Date(paidDate) : undefined);
      
      if (success) {
        res.json({ message: "Invoice marked as paid successfully" });
      } else {
        res.status(404).json({ message: "Invoice not found or could not be updated" });
      }
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      res.status(500).json({ message: "Failed to mark invoice as paid" });
    }
  });

  app.post('/api/invoices/:id/send-reminder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceId = parseInt(req.params.id);
      
      const { invoiceManager } = await import('./invoice-manager');
      const success = await invoiceManager.generateOverdueReminder(invoiceId, userId);
      
      if (success) {
        res.json({ message: "Overdue reminder sent successfully" });
      } else {
        res.status(400).json({ message: "Could not send reminder. Invoice may not be overdue or client email missing." });
      }
    } catch (error) {
      console.error("Error sending overdue reminder:", error);
      res.status(500).json({ message: "Failed to send overdue reminder" });
    }
  });

  app.post('/api/invoices/check-overdue', isAuthenticated, async (req: any, res) => {
    try {
      const { invoiceManager } = await import('./invoice-manager');
      await invoiceManager.updateOverdueInvoices();
      res.json({ message: "Overdue invoices updated successfully" });
    } catch (error) {
      console.error("Error checking overdue invoices:", error);
      res.status(500).json({ message: "Failed to update overdue invoices" });
    }
  });

  // Email enquiry intake route (manual testing)
  app.post('/api/enquiries/email-intake', async (req, res) => {
    try {
      const { from, subject, body, receivedAt } = req.body;
      
      // Extract key information from email
      const { parseEmailEnquiry } = await import('./email-parser');
      const enquiryData = await parseEmailEnquiry(from, subject, body);
      
      // Create enquiry with extracted data
      const enquiry = await storage.createEnquiry({
        title: enquiryData.title,
        clientName: enquiryData.clientName,
        clientEmail: enquiryData.clientEmail || null,
        clientPhone: enquiryData.clientPhone || null,
        eventDate: enquiryData.eventDate || new Date(),
        venue: enquiryData.venue || null,
        notes: enquiryData.message,
        userId: "43963086", // Main account owner
        status: 'new',
      });
      
      res.json({ message: "Email enquiry processed successfully", enquiry });
    } catch (error) {
      console.error("Error processing email enquiry:", error);
      res.status(500).json({ message: "Failed to process email enquiry" });
    }
  });



  // Email processing: Single Mailgun webhook handler in server/index.ts

  // Booking routes
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/bookings/upcoming', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getUpcomingBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error);
      res.status(500).json({ message: "Failed to fetch upcoming bookings" });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const bookingData = insertBookingSchema.parse(data);
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Compliance document routes
  app.get('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getComplianceDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching compliance documents:", error);
      res.status(500).json({ message: "Failed to fetch compliance documents" });
    }
  });

  app.post('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documentData = insertComplianceDocumentSchema.parse({ ...req.body, userId });
      const document = await storage.createComplianceDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating compliance document:", error);
      res.status(500).json({ message: "Failed to create compliance document" });
    }
  });

  // User settings routes
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = await storage.getUserSettings(userId);
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log("🔥 Saving settings for user:", userId);
      console.log("🔥 Request body:", req.body);
      console.log("🔥 customInstruments in request:", req.body.customInstruments);
      
      const settingsData = { ...req.body, userId };
      console.log("🔥 Settings data to save:", settingsData);
      console.log("🔥 customInstruments in settings data:", settingsData.customInstruments);
      
      const settings = await storage.upsertUserSettings(settingsData);
      console.log("🔥 Settings saved successfully:", settings);
      console.log("🔥 customInstruments in saved settings:", settings?.customInstruments);
      res.json(settings);
    } catch (error) {
      console.error("Error saving user settings:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Client (Address Book) routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientData = insertClientSchema.parse({ ...req.body, userId });
      const client = await storage.createClient(clientData);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientId = parseInt(req.params.id);
      const updateData = req.body;
      
      const client = await storage.updateClient(clientId, updateData, userId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete('/api/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clientId = parseInt(req.params.id);
      
      const success = await storage.deleteClient(clientId, userId);
      if (success) {
        res.json({ message: "Client deleted successfully" });
      } else {
        res.status(404).json({ message: "Client not found" });
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Conflict detection API routes
  app.get('/api/conflicts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conflicts = await storage.getUnresolvedConflicts(userId);
      res.json(conflicts);
    } catch (error) {
      console.error("Error fetching conflicts:", error);
      res.status(500).json({ message: "Failed to fetch conflicts" });
    }
  });

  app.post('/api/conflicts/:id/resolve', isAuthenticated, async (req: any, res) => {
    try {
      const conflictId = parseInt(req.params.id);
      const { resolution, notes } = req.body;
      
      const resolvedConflict = await storage.resolveConflict(conflictId, resolution, notes);
      
      if (resolvedConflict) {
        res.json({ message: "Conflict resolved successfully", conflict: resolvedConflict });
      } else {
        res.status(404).json({ message: "Conflict not found" });
      }
    } catch (error) {
      console.error("Error resolving conflict:", error);
      res.status(500).json({ message: "Failed to resolve conflict" });
    }
  });

  // Setup multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Calendar Import Routes
  


  // Import from Calendar file (.ics file)
  app.post('/api/calendar/import', isAuthenticated, upload.single('icsFile'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "Please upload an .ics file" });
      }

      const icsContent = req.file.buffer.toString('utf8');
      
      // Parse calendar file
      const importResult = await parseAppleCalendar(icsContent);

      if (!importResult.success) {
        return res.status(500).json({ 
          message: "Failed to parse calendar file",
          errors: importResult.errors
        });
      }

      // Convert events to MusoBuddy bookings
      const conversionResult = await convertEventsToBookings(userId, importResult.events);

      res.json({
        success: true,
        imported: importResult.imported,
        skipped: importResult.skipped + conversionResult.skipped,
        created: conversionResult.created,
        errors: [...importResult.errors, ...conversionResult.errors],
        message: `Successfully imported ${conversionResult.created} bookings from calendar file`
      });
    } catch (error) {
      console.error("Error importing calendar file:", error);
      res.status(500).json({ message: "Failed to import calendar file" });
    }
  });



  // Catch-all route to log any unmatched requests
  app.use('*', (req, res, next) => {
    console.log(`=== UNMATCHED ROUTE: ${req.method} ${req.originalUrl} ===`);
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}
