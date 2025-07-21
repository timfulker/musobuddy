import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthentication } from "./auth-config";
import { isAuthenticated, isAdmin } from "./auth";
import { insertEnquirySchema, insertContractSchema, insertInvoiceSchema, insertBookingSchema, insertComplianceDocumentSchema, insertEmailTemplateSchema, insertClientSchema, insertImportedContractSchema } from "@shared/schema";
import multer from 'multer';
import { uploadFileToCloudflare } from './cloud-storage';

import { 
  parseAppleCalendar,
  convertEventsToBookings
} from './calendar-import';
import OpenAI from 'openai';
import bcrypt from 'bcrypt';

// Validate PDF text extraction quality
function validateContractText(text: string): { isValid: boolean; reason?: string } {
  const textLength = text.trim().length;
  
  // Check for minimum content
  if (textLength < 500) {
    return { isValid: false, reason: 'Extracted text too short (less than 500 characters)' };
  }
  
  // Check for common contract indicators
  const hasContractKeywords = /musicians.?union|engagement|hirer|musician|contract|agreement/i.test(text);
  if (!hasContractKeywords) {
    return { isValid: false, reason: 'Text does not contain expected contract keywords' };
  }
  
  // Check for excessive fragmentation (many single-character "words")
  const words = text.split(/\s+/);
  const singleCharWords = words.filter(w => w.trim().length === 1 || w.trim().length === 2);
  const fragmentationRatio = singleCharWords.length / words.length;
  
  if (fragmentationRatio > 0.3) {
    return { isValid: false, reason: `High text fragmentation detected (${Math.round(fragmentationRatio * 100)}% single/double character fragments)` };
  }
  
  // Check for repeated meaningless fragments
  const fragmentPattern = /\b(of|to|and|the|a|an|in|on|at|by)\b/gi;
  const fragments = text.match(fragmentPattern) || [];
  const fragmentRatio = fragments.length / words.length;
  
  if (fragmentRatio > 0.4) {
    return { isValid: false, reason: `Excessive meaningless fragments detected (${Math.round(fragmentRatio * 100)}% common words only)` };
  }
  
  // Check for specific corruption patterns that indicate incomplete field extraction
  if (text.includes('between of and of') || 
      text.includes('made on between') ||
      text.includes('between  of  and  of') ||
      text.match(/\bof\s+and\s+of\b/i) ||
      text.match(/between\s+of\s+and\s+of/i) ||
      text.match(/made\s+on\s+between\s+of/i)) {
    return { isValid: false, reason: 'Contract contains corrupted field extraction patterns (incomplete client/musician details)' };
  }
  
  return { isValid: true };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Invoice route now registered in server/index.ts to avoid Vite interference
  
  // Auth middleware setup with configuration manager
  await setupAuthentication(app);

  // Debug middleware to log all requests
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`🔍 API REQUEST: ${req.method} ${req.path}`);
    }
    next();
  });

  // Clear cached instrument mapping (for testing/debugging) - placed early to avoid Vite conflicts
  app.post('/api/clear-instrument-cache', async (req, res) => {
    try {
      const { instrument } = req.body;
      const cleared = await storage.clearInstrumentMapping(instrument);
      res.json({ 
        success: true, 
        cleared,
        message: `Cleared cached mapping for ${instrument}` 
      });
    } catch (error) {
      console.error('Error clearing instrument mapping:', error);
      res.status(500).json({ error: 'Failed to clear mapping' });
    }
  });

  // Test endpoint for Mailgun email sending (no auth for testing)
  app.post('/api/test-email', async (req: any, res) => {
    try {
      const { sendEmail } = await import('./mailgun-email');
      
      const testResult = await sendEmail({
        to: 'test@example.com',
        from: 'MusoBuddy <noreply@mg.musobuddy.com>',
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

  // Test endpoint for confirmation email format (no auth for testing)
  app.post('/api/test-confirmation-email', async (req: any, res) => {
    try {
      const { sendEmail } = await import('./mailgun-email');
      
      // Simulate the exact format used in contract confirmation emails
      const testResult = await sendEmail({
        to: 'test@example.com',
        from: 'MusoBuddy <noreply@mg.musobuddy.com>',
        subject: 'Contract TEST-001 Successfully Signed ✓',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
            <p>Dear Test Client,</p>
            <p>Your performance contract <strong>TEST-001</strong> has been successfully signed!</p>
            <p>This is a test of the confirmation email system.</p>
          </div>
        `,
        text: 'Contract TEST-001 successfully signed by Test Client.'
      });
      
      res.json({ 
        success: testResult,
        message: testResult ? 'Confirmation email test sent successfully' : 'Confirmation email test failed to send'
      });
    } catch (error: any) {
      console.error('Test confirmation email error:', error);
      res.status(500).json({ error: 'Failed to send test confirmation email' });
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
      console.log('🤖 Instrument Mapping Key available:', !!process.env.OPENAI_INSTRUMENT_MAPPING_KEY);
      
      if (!process.env.OPENAI_INSTRUMENT_MAPPING_KEY) {
        return res.json({ error: 'OpenAI Instrument Mapping key not available' });
      }

      const instrumentMappingAI = new OpenAI({
        apiKey: process.env.OPENAI_INSTRUMENT_MAPPING_KEY,
      });

      const response = await instrumentMappingAI.chat.completions.create({
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
      res.json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Gig suggestions endpoint with AI fallback for unknown instruments
  app.post('/api/gig-suggestions', isAuthenticated, async (req, res) => {
    try {
      const { instruments } = req.body;
      
      if (!instruments || !Array.isArray(instruments)) {
        return res.status(400).json({ error: 'Instruments array is required' });
      }

      // Expanded default mappings for known instruments
      const defaultGigMappings = {
        'saxophone': ['Wedding Ceremony Music', 'Jazz Club Performance', 'Corporate Event Entertainment', 'Function Band', 'Sax + DJ', 'Wedding Reception', 'Private Party', 'Cocktail Hour', 'Hotel Lounge', 'Wine Tasting', 'Art Gallery Opening', 'Smooth Jazz Venue', 'Background Music', 'Rooftop Event', 'Dinner Music', 'Street Performance', 'Festival Performance', 'Busking', 'Christmas Event', 'New Year Party'],
        'guitar': ['Acoustic Wedding Ceremony', 'Spanish Guitar', 'Classical Guitar', 'Folk Music', 'Singer-Songwriter', 'Acoustic Duo', 'Background Music', 'Coffee Shop', 'Restaurant Performance', 'Campfire Session', 'Open Mic Night', 'Unplugged Performance', 'Street Performance', 'Farmers Market', 'Wine Bar', 'Outdoor Wedding', 'Intimate Venue', 'Beach Wedding', 'Garden Party', 'Fingerstyle Performance'],
        'piano': ['Piano Bar', 'Wedding Ceremony', 'Classical Recital', 'Jazz Piano', 'Cocktail Piano', 'Restaurant Background', 'Solo Piano', 'Hotel Lobby', 'Cocktail Hour', 'Background Music', 'Corporate Reception', 'Wine Tasting', 'Art Gallery Opening', 'Brunch Music', 'Lounge Performance', 'Champagne Reception', 'Dinner Music', 'Holiday Performance', 'Charity Event', 'Nursing Home Visit'],
        'vocals': ['Wedding Singer', 'Jazz Vocalist', 'Corporate Entertainment', 'Function Band Vocals', 'Solo Vocalist', 'Tribute Acts', 'Karaoke Host', 'Acoustic Session', 'Open Mic Night', 'Tribute Performance', 'Cover Band', 'Background Vocals', 'Session Work', 'Choir Performance', 'Musical Theater', 'Cabaret Performance', 'Lounge Singer', 'Holiday Caroling', 'Church Service', 'Funeral Service'],
        'dj': ['Wedding DJ', 'Corporate Event DJ', 'Party DJ', 'Club DJ', 'Mobile DJ', 'Sax + DJ', 'Event DJ', 'Birthday Party', 'Anniversary Party', 'School Dance', 'Graduation Party', 'Holiday Party', 'Cocktail Reception', 'Rooftop Event', 'Beach Party', 'Pool Party', 'Outdoor Festival', 'Silent Disco', 'Karaoke Night', 'Bingo Night'],
        'violin': ['Wedding Ceremony', 'String Quartet', 'Classical Performance', 'Folk Violin', 'Electric Violin', 'Background Music', 'Solo Violin', 'Chamber Music', 'Art Gallery Opening', 'Wine Tasting', 'Cocktail Hour', 'Outdoor Wedding', 'Garden Party', 'Recital', 'Funeral Service', 'Holiday Performance', 'Christmas Event', 'New Year Performance', 'Celtic Music', 'Bluegrass Performance'],
        'trumpet': ['Jazz Band', 'Big Band', 'Wedding Fanfare', 'Classical Trumpet', 'Brass Ensemble', 'Mariachi Band', 'Military Ceremony', 'Dixieland Jazz', 'Swing Band', 'Corporate Event', 'Outdoor Festival', 'Street Performance', 'Busking', 'Church Service', 'Funeral Service', 'Holiday Performance', 'Christmas Concert', 'New Year Celebration', 'Salsa Band', 'Latin Music'],
        'drums': ['Function Band', 'Jazz Ensemble', 'Rock Band', 'Wedding Band', 'Corporate Event Band', 'Percussion Solo', 'Session Musician', 'Acoustic Session', 'Drum Circle', 'Educational Performance', 'Corporate Team Building', 'Festival Performance', 'Studio Recording', 'Backing Band', 'Tribute Band', 'Cover Band', 'Jam Session', 'Blues Club', 'Rock Venue', 'Latin Percussion'],
        'bass': ['Function Band', 'Jazz Ensemble', 'Wedding Band', 'Corporate Event Band', 'Session Musician', 'Acoustic Bass', 'Electric Bass', 'Studio Recording', 'Jam Session', 'Blues Club', 'Rock Venue', 'Festival Performance', 'Tribute Band', 'Cover Band', 'Backing Band', 'Walking Bass', 'Upright Bass', 'Slap Bass', 'Fretless Bass', 'Jazz Trio'],
        'keyboard': ['Function Band', 'Wedding Ceremony', 'Jazz Piano', 'Corporate Entertainment', 'Solo Keyboard', 'Accompanist', 'Session Musician', 'Synthesizer Performance', 'Electronic Music', 'Backing Tracks', 'Studio Recording', 'Worship Team', 'Church Service', 'Musical Theater', 'Cabaret Performance', 'Lounge Performance', 'Background Music', 'Cocktail Hour', 'Dance Music', 'Ambient Music'],
        'cello': ['Wedding Ceremony', 'String Quartet', 'Classical Performance', 'Solo Cello', 'Chamber Music', 'Background Music', 'Church Music', 'Funeral Service', 'Art Gallery Opening', 'Wine Tasting', 'Cocktail Hour', 'Outdoor Wedding', 'Garden Party', 'Recital', 'Holiday Performance', 'Christmas Concert', 'New Year Performance', 'Celtic Music', 'Folk Music', 'Contemporary Classical'],
        'flute': ['Wedding Ceremony', 'Classical Performance', 'Jazz Flute', 'Folk Music', 'Solo Flute', 'Wind Ensemble', 'Background Music', 'Art Gallery Opening', 'Wine Tasting', 'Cocktail Hour', 'Outdoor Wedding', 'Garden Party', 'Recital', 'Chamber Music', 'Piccolo Performance', 'Native American Flute', 'Meditation Music', 'Healing Music', 'New Age Performance', 'World Music'],
        'harp': ['Wedding Ceremony', 'Classical Harp', 'Celtic Harp', 'Background Music', 'Solo Harp', 'Church Music', 'Private Events', 'Art Gallery Opening', 'Wine Tasting', 'Cocktail Hour', 'Outdoor Wedding', 'Garden Party', 'Recital', 'Funeral Service', 'Holiday Performance', 'Christmas Concert', 'Medieval Music', 'Folk Music', 'Therapeutic Music', 'Healing Music'],
        'trombone': ['Jazz Band', 'Big Band', 'Brass Ensemble', 'Wedding Fanfare', 'Classical Trombone', 'Mariachi Band', 'Military Ceremony', 'Dixieland Jazz', 'Swing Band', 'Corporate Event', 'Outdoor Festival', 'Street Performance', 'Busking', 'Church Service', 'Funeral Service', 'Holiday Performance', 'Christmas Concert', 'New Year Celebration', 'Salsa Band', 'Latin Music'],
        'clarinet': ['Jazz Ensemble', 'Classical Performance', 'Wedding Ceremony', 'Folk Music', 'Solo Clarinet', 'Wind Ensemble', 'Background Music', 'Klezmer Music', 'Dixieland Jazz', 'Swing Band', 'Corporate Event', 'Outdoor Festival', 'Street Performance', 'Busking', 'Church Service', 'Holiday Performance', 'Christmas Concert', 'New Year Performance', 'Chamber Music', 'Woodwind Quintet']
      };

      // Collect suggestions from default mappings and database cache
      const allSuggestions = [];
      const unknownInstruments = [];

      for (const instrument of instruments) {
        const normalizedInstrument = instrument.toLowerCase();
        
        // Always prioritize expanded default mappings for known instruments
        const gigTypes = defaultGigMappings[normalizedInstrument as keyof typeof defaultGigMappings];
        if (gigTypes) {
          console.log('🎵 Using expanded default mapping for', normalizedInstrument);
          allSuggestions.push(...gigTypes);
          continue; // Skip to next instrument
        }
        
        // For unknown instruments, check cached AI mappings first
        const cachedMapping = await storage.getInstrumentMapping(normalizedInstrument);
        if (cachedMapping) {
          console.log('🎵 Using cached AI mapping for', normalizedInstrument);
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
        
        // If no default or cached mapping exists, add to unknown instruments for AI generation
        unknownInstruments.push(instrument);
      }

      // Use OpenAI for unknown instruments if available
      if (unknownInstruments.length > 0 && process.env.OPENAI_INSTRUMENT_MAPPING_KEY) {
        try {
          console.log('🤖 Instrument Mapping AI Key available:', !!process.env.OPENAI_INSTRUMENT_MAPPING_KEY);
          const instrumentMappingAI = new OpenAI({
            apiKey: process.env.OPENAI_INSTRUMENT_MAPPING_KEY,
          });

          console.log('🤖 Calling OpenAI for instruments:', unknownInstruments);

          const response = await instrumentMappingAI.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "You are a music industry expert. Generate diverse, creative gig type names (2-4 words maximum). Think broadly across all venues and event types: weddings, corporate events, private parties, clubs, restaurants, hotels, festivals, street performances, background music, entertainment, ceremonies, celebrations, etc. Return only a JSON object with a 'gig_types' array."
              },
              {
                role: "user",
                content: `Generate 12-15 diverse gig types for a musician who plays: ${unknownInstruments.join(', ')}. Include traditional gigs, modern venues, creative opportunities, and unique performance contexts. Return ONLY short names (2-4 words), no descriptions.`
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 300
          });

          console.log('🤖 OpenAI response:', response.choices[0].message.content);

          const aiResult = JSON.parse(response.choices[0].message.content || '{}');
          console.log('🤖 Parsed AI result:', aiResult);
          
          if (aiResult.gig_types && Array.isArray(aiResult.gig_types)) {
            console.log('🤖 Adding AI suggestions:', aiResult.gig_types);
            // Extract just the type names from the AI response and clean them up
            const gigTypeNames = aiResult.gig_types.map((item: any) => {
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
          console.log('AI suggestions not available for unknown instruments:', unknownInstruments, error instanceof Error ? error.message : 'Unknown error');
        }
      } else if (unknownInstruments.length > 0) {
        console.log('OpenAI API key not available for unknown instruments:', unknownInstruments);
      }

      // Remove duplicates and sort
      const uniqueSuggestions = Array.from(new Set(allSuggestions)).sort();

      console.log('🎵 Final suggestions:', uniqueSuggestions);
      res.json({ suggestions: uniqueSuggestions });

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

  // Clear cached instrument mapping (for testing/debugging)
  app.delete('/api/instrument-mapping/:instrument', async (req, res) => {
    try {
      const instrument = req.params.instrument;
      const cleared = await storage.clearInstrumentMapping(instrument);
      res.json({ 
        success: true, 
        cleared,
        message: `Cleared cached mapping for ${instrument}` 
      });
    } catch (error) {
      console.error('Error clearing instrument mapping:', error);
      res.status(500).json({ error: 'Failed to clear mapping' });
    }
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

  // Auth route is now handled in auth.ts to avoid conflicts

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
    } catch (error: any) {
      console.error("Error creating enquiry via quick-add:", error);
      console.error("Error details:", error.stack);
      res.status(500).json({ message: "Failed to create enquiry", error: error.message || error });
    }
  });

  // Enquiry routes
  app.get('/api/enquiries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enquiries = await storage.getEnquiries(userId);
      res.json(enquiries);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
      res.status(500).json({ message: "Failed to fetch enquiries" });
    }
  });

  app.get('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      
      // Auto-create calendar booking for enquiry (if it has a date)
      if (enquiry.eventDate && enquiry.venue && enquiry.clientName) {
        try {
          const bookingData = {
            userId: userId,
            contractId: null, // No contract yet
            title: enquiry.title,
            clientName: enquiry.clientName,
            eventDate: enquiry.eventDate,
            eventTime: enquiry.eventTime || '12:00',
            eventEndTime: enquiry.eventEndTime,
            performanceDuration: enquiry.performanceDuration,
            venue: enquiry.venue,
            fee: enquiry.quotedAmount ? parseFloat(enquiry.quotedAmount.toString()) : 0,
            status: 'confirmed', // Show as confirmed in calendar
            notes: `Auto-created from enquiry #${enquiry.id}. Status: ${enquiry.status}${enquiry.notes ? '. Notes: ' + enquiry.notes : ''}`
          };
          
          const booking = await storage.createBooking(bookingData);
          console.log(`✅ Auto-created calendar booking #${booking.id} for enquiry #${enquiry.id}`);
        } catch (bookingError) {
          console.error('Failed to auto-create calendar booking:', bookingError);
          // Don't fail the enquiry creation if booking fails
        }
      }
      
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const id = parseInt(req.params.id);
      
      // Find and delete any auto-created calendar bookings for this enquiry
      try {
        const bookings = await storage.getBookings(userId);
        const relatedBookings = bookings.filter(booking => 
          booking.notes && booking.notes.includes(`Auto-created from enquiry #${id}`)
        );
        
        for (const booking of relatedBookings) {
          await storage.deleteBooking(booking.id, userId);
          console.log(`✅ Deleted calendar booking #${booking.id} for enquiry #${id}`);
        }
      } catch (bookingError) {
        console.error('Failed to delete related calendar bookings:', bookingError);
        // Don't fail the enquiry deletion if booking cleanup fails
      }
      
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

  // Transfer existing enquiries to calendar (one-time migration)
  app.post('/api/transfer-enquiries-to-calendar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const enquiries = await storage.getEnquiries(userId);
      let transferredCount = 0;
      let skippedCount = 0;
      
      console.log(`📅 Starting transfer of ${enquiries.length} enquiries to calendar for user ${userId}`);
      
      for (const enquiry of enquiries) {
        // Only transfer enquiries that have dates and aren't already in calendar
        if (enquiry.eventDate && enquiry.venue && enquiry.clientName) {
          try {
            // Check if this enquiry already has a calendar booking
            const existingBookings = await storage.getBookings(userId);
            const alreadyExists = existingBookings.some(booking => 
              booking.notes && booking.notes.includes(`Auto-created from enquiry #${enquiry.id}`)
            );
            
            if (!alreadyExists) {
              const bookingData = {
                userId: userId,
                contractId: null,
                title: enquiry.title,
                clientName: enquiry.clientName,
                eventDate: enquiry.eventDate,
                eventTime: enquiry.eventTime || '12:00',
                eventEndTime: enquiry.eventEndTime,
                performanceDuration: enquiry.performanceDuration,
                venue: enquiry.venue,
                fee: enquiry.quotedAmount ? parseFloat(enquiry.quotedAmount.toString()) : 0,
                status: 'confirmed',
                notes: `Auto-created from enquiry #${enquiry.id}. Status: ${enquiry.status}${enquiry.notes ? '. Notes: ' + enquiry.notes : ''}`
              };
              
              await storage.createBooking(bookingData);
              transferredCount++;
              console.log(`✅ Transferred enquiry #${enquiry.id} to calendar`);
            } else {
              skippedCount++;
              console.log(`⏭️ Skipped enquiry #${enquiry.id} - already exists in calendar`);
            }
          } catch (error) {
            console.error(`❌ Failed to transfer enquiry #${enquiry.id}:`, error);
            skippedCount++;
          }
        } else {
          skippedCount++;
          console.log(`⏭️ Skipped enquiry #${enquiry.id} - missing date/venue/client info`);
        }
      }
      
      console.log(`📅 Transfer complete: ${transferredCount} transferred, ${skippedCount} skipped`);
      
      res.json({
        success: true,
        message: `Successfully transferred ${transferredCount} enquiries to calendar`,
        details: {
          total: enquiries.length,
          transferred: transferredCount,
          skipped: skippedCount
        }
      });
    } catch (error) {
      console.error('Error transferring enquiries to calendar:', error);
      res.status(500).json({ message: 'Failed to transfer enquiries to calendar' });
    }
  });

  // Send response to enquiry
  app.post('/api/enquiries/send-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      
      const { sendEmail } = await import('./mailgun-email');
      const success = await sendEmail(emailParams);
      
      if (success) {
        // Update enquiry status to indicate response sent
        await storage.updateEnquiry(enquiryId, { 
          status: 'qualified',
          notes: enquiry.notes ? `${enquiry.notes}\n\n--- Response sent on ${new Date().toLocaleDateString('en-GB')} ---\nSubject: ${subject}\nMessage: ${body}` : `Response sent on ${new Date().toLocaleDateString('en-GB')}\nSubject: ${subject}\nMessage: ${body}`
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  // Get imported contracts for contract learning
  app.get('/api/contracts/imported', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const importedContracts = await storage.getImportedContracts(userId);
      res.json(importedContracts);
    } catch (error) {
      console.error("Error fetching imported contracts:", error);
      res.status(500).json({ message: "Failed to fetch imported contracts" });
    }
  });

  // Upload contract for learning system
  const contractUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed for contract learning'));
      }
    }
  });

  app.post('/api/contracts/import', isAuthenticated, contractUpload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Upload to cloud storage
      const storageKey = `contracts/imported/${userId}/${Date.now()}-${file.originalname}`;
      const uploadResult = await uploadFileToCloudflare(file.buffer, storageKey, file.mimetype);
      
      if (!uploadResult.success) {
        return res.status(500).json({ 
          message: "Failed to upload to cloud storage",
          error: uploadResult.error 
        });
      }
      
      // Create imported contract record
      const importedContract = await storage.createImportedContract({
        userId,
        filename: file.originalname,
        cloudUrl: uploadResult.url || storageKey,
        fileSize: file.size,
        uploadedAt: new Date()
      });

      res.status(201).json({
        success: true,
        contract: importedContract,
        message: "Contract uploaded successfully for learning system"
      });
    } catch (error) {
      console.error("Error importing contract:", error);
      res.status(500).json({ 
        message: "Failed to import contract",
        error: error instanceof Error ? error.message : "Unknown error"
      });
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
      const userId = req.user.id;
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

  // Invoice PDF download route - forces download with Content-Disposition header
  app.get('/api/invoices/:id/download', async (req: any, res) => {
    console.log('Download request for invoice:', req.params.id);
    
    try {
      const invoiceId = parseInt(req.params.id);
      let invoice = null;
      let userSettings = null;
      let contract = null;

      // Try authenticated access first
      if (req.user && req.user.claims && req.user.id) {
        const userId = req.user.id;
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
      
      // Send PDF for download with Content-Disposition header
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache');
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating invoice PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    }
  });

  // Invoice PDF endpoint - supports both authenticated and public access (inline viewing)
  app.get('/api/invoices/:id/pdf', async (req: any, res) => {
    console.log('PDF request for invoice:', req.params.id);
    
    try {
      const invoiceId = parseInt(req.params.id);
      let invoice = null;
      let userSettings = null;
      let contract = null;

      // Try authenticated access first
      if (req.user && req.user.claims && req.user.id) {
        const userId = req.user.id;
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
      const userId = req.user.id;
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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

  // Bulk contract deletion
  app.post('/api/contracts/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { contractIds } = req.body;
      
      if (!Array.isArray(contractIds) || contractIds.length === 0) {
        return res.status(400).json({ message: "Contract IDs array is required" });
      }

      const results = [];
      let successCount = 0;
      let failCount = 0;

      for (const contractId of contractIds) {
        try {
          const success = await storage.deleteContract(parseInt(contractId), userId);
          if (success) {
            successCount++;
            results.push({ contractId, success: true });
          } else {
            failCount++;
            results.push({ contractId, success: false, error: "Contract not found" });
          }
        } catch (error) {
          failCount++;
          results.push({ contractId, success: false, error: error.message });
        }
      }

      res.json({
        message: `Bulk deletion completed: ${successCount} successful, ${failCount} failed`,
        results,
        summary: {
          total: contractIds.length,
          successful: successCount,
          failed: failCount
        }
      });
    } catch (error) {
      console.error("Error in bulk contract deletion:", error);
      res.status(500).json({ message: "Failed to delete contracts" });
    }
  });

  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🔥 CONTRACT CREATION: Starting contract creation process');
      console.log('🔥 CONTRACT CREATION: req.user:', req.user);
      console.log('🔥 CONTRACT CREATION: req.isAuthenticated():', req.isAuthenticated());
      
      if (!req.user || !req.user.claims || !req.user.id) {
        console.log('🔥 CONTRACT CREATION: User object is missing or invalid');
        return res.status(401).json({ message: "User authentication failed - please log in again" });
      }
      
      const userId = req.user.id;
      console.log('🔥 CONTRACT CREATION: User ID:', userId);
      console.log('🔥 CONTRACT CREATION: Request body:', JSON.stringify(req.body, null, 2));
      
      const data = { ...req.body, userId };
      console.log('🔥 CONTRACT CREATION: Data with userId:', JSON.stringify(data, null, 2));
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        console.log('🔥 CONTRACT CREATION: Converting eventDate from string to Date');
        data.eventDate = new Date(data.eventDate);
      }
      
      // Set reminder defaults if not provided
      if (!data.hasOwnProperty('reminderEnabled')) {
        data.reminderEnabled = false;
      }
      if (!data.hasOwnProperty('reminderDays')) {
        data.reminderDays = 3;
      }
      
      console.log('🔥 CONTRACT CREATION: About to parse with schema');
      const contractData = insertContractSchema.parse(data);
      console.log('🔥 CONTRACT CREATION: Schema validation passed');
      
      console.log('🔥 CONTRACT CREATION: About to create contract in storage');
      const contract = await storage.createContract(contractData);
      console.log('🔥 CONTRACT CREATION: Contract created successfully:', contract.id);
      
      // Update booking to reflect contract creation
      if (contract.enquiryId) {
        console.log('🔥 CONTRACT CREATION: Updating booking with contract tracking');
        await storage.updateBooking(contract.enquiryId, { 
          contractSent: true,
          status: 'contract_sent'
        }, userId);
      }
      
      res.status(201).json(contract);
    } catch (error) {
      console.error("🔥 CONTRACT CREATION ERROR:", error);
      console.error("🔥 CONTRACT CREATION ERROR message:", error.message);
      console.error("🔥 CONTRACT CREATION ERROR stack:", error.stack);
      console.error("🔥 CONTRACT CREATION ERROR name:", error.name);
      console.error("🔥 CONTRACT CREATION ERROR code:", error.code);
      res.status(500).json({ message: "Failed to create contract", error: error.message });
    }
  });

  // Process contract reminders
  app.post('/api/contracts/process-reminders', isAuthenticated, async (req: any, res) => {
    try {
      const { ContractReminderService } = await import('./contract-reminder-service');
      const reminderService = new ContractReminderService();
      
      const result = await reminderService.processContractReminders();
      
      res.json({
        success: true,
        message: `Reminder processing completed: ${result.sent} sent, ${result.failed} failed`,
        result
      });
    } catch (error) {
      console.error('Error processing contract reminders:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to process contract reminders',
        error: error.message 
      });
    }
  });

  // Silent URL maintenance (no emails sent, just keeps URLs fresh)
  app.post('/api/contracts/maintain-urls', isAuthenticated, async (req: any, res) => {
    try {
      const { urlMaintenanceService } = await import('./url-maintenance-service');
      
      const result = await urlMaintenanceService.maintainContractSigningUrls();
      
      res.json({
        success: true,
        message: `URL maintenance completed: ${result.regenerated} regenerated, ${result.failed} failed`,
        result
      });
    } catch (error) {
      console.error('Error maintaining contract URLs:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to maintain contract URLs',
        error: error.message 
      });
    }
  });



  // Support chat API
  app.post('/api/support-chat', isAuthenticated, async (req: any, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Initialize OpenAI for support chat
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ 
        apiKey: process.env.OPENAI_SUPPORT_CHAT_KEY 
      });

      const systemPrompt = `You are a helpful support assistant for MusoBuddy, a music business management platform. 
      
      You help musicians with:
      - Email forwarding setup (leads@musobuddy.com)
      - Contract creation and digital signing
      - Invoice management and payment tracking
      - Calendar and booking management
      - Client management and address book
      - Settings and business configuration
      - Troubleshooting common issues
      
      Key features to mention:
      - Email forwarding automatically creates enquiries from leads@musobuddy.com
      - Contract signing works 24/7 with cloud-hosted pages
      - URLs automatically regenerate every 6 days
      - Reminders can be set for 1, 3, or 5 days
      - Invoices auto-fill from contracts with UK tax compliance
      - Calendar supports .ics import/export for all major calendar apps
      - Mobile-optimized with responsive design
      
      Be helpful, concise, and professional. If you're unsure about something, suggest they check the User Guide or contact support.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const response = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";
      
      res.json({ response });
    } catch (error) {
      console.error('Support chat error:', error);
      res.status(500).json({ 
        error: 'Failed to process support request',
        response: 'I apologize, but I\'m having trouble responding right now. Please try again in a moment or check the User Guide for help.'
      });
    }
  });

  app.patch('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contractId = parseInt(req.params.id);
      const updates = req.body;
      
      // Convert eventDate string to Date if present
      if (updates.eventDate && typeof updates.eventDate === 'string') {
        updates.eventDate = new Date(updates.eventDate);
      }
      
      const updatedContract = await storage.updateContract(contractId, updates, userId);
      if (!updatedContract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      res.json(updatedContract);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
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
      const userId = req.user.id;
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.delete('/api/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const invoiceId = parseInt(req.params.id);
      
      console.log("🔥 Backend: DELETE request for invoice:", invoiceId, "by user:", userId);
      
      const success = await storage.deleteInvoice(invoiceId, userId);
      console.log("🔥 Backend: Delete result:", success);
      
      if (success) {
        console.log("🔥 Backend: Invoice deleted successfully");
        res.json({ message: "Invoice deleted successfully" });
      } else {
        console.log("🔥 Backend: Invoice not found");
        res.status(404).json({ message: "Invoice not found" });
      }
    } catch (error) {
      console.error("🔥 Backend: Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // Create invoice
  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      console.log("🔥 Backend: Invoice creation request received");
      const userId = req.user.id;
      console.log("🔥 Backend: User ID:", userId);
      console.log("🔥 Backend: Request body:", JSON.stringify(req.body, null, 2));
      
      const data = { ...req.body, userId };
      
      // Convert date strings to Date objects if present
      if (data.dueDate && typeof data.dueDate === 'string') {
        data.dueDate = new Date(data.dueDate);
      }
      if (data.performanceDate && typeof data.performanceDate === 'string') {
        data.performanceDate = new Date(data.performanceDate);
      }
      
      // Keep decimal amounts as strings for Drizzle ORM compatibility
      
      console.log("🔥 Backend: Data before Zod validation:", JSON.stringify(data, null, 2));
      
      const invoiceData = insertInvoiceSchema.parse(data);
      console.log("🔥 Backend: Data after Zod validation:", JSON.stringify(invoiceData, null, 2));
      
      const invoice = await storage.createInvoice(invoiceData);
      console.log("🔥 Backend: Invoice created successfully:", invoice.id);
      
      // Update booking to reflect invoice creation
      if (invoice.bookingId) {
        await storage.updateBooking(invoice.bookingId, { 
          invoiceSent: true 
        }, userId);
      }
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error("🔥 Backend: Error creating invoice:", error);
      if (error instanceof Error) {
        console.error("🔥 Backend: Error message:", error.message);
        console.error("🔥 Backend: Error stack:", error.stack);
      }
      res.status(500).json({ message: "Failed to create invoice", error: error.message });
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
      console.error("Error code:", (error as any).code);
      console.error("Error stack:", (error as any).stack);
      console.error("Invoice ID:", req.params.id);
      console.error("User ID:", req.user?.id);
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



  // Send invoice email using hybrid approach
  app.post('/api/invoices/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { invoiceId, customMessage } = req.body;
      
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
      
      // Update booking to reflect invoice being sent
      if (invoice.bookingId) {
        await storage.updateBooking(invoice.bookingId, { 
          invoiceSent: true 
        }, userId);
      }

      console.log('📧 Sending invoice email with hybrid approach:', updatedInvoice.invoiceNumber);
      
      // Use enhanced hybrid email function with PDF attachment + cloud storage
      const { sendInvoiceEmail } = await import('./mailgun-email');
      const success = await sendInvoiceEmail(updatedInvoice, contract, userSettings, customMessage);
      
      if (success) {
        res.json({ message: "Invoice email sent successfully with PDF attachment and static backup link" });
      } else {
        res.status(500).json({ message: "Failed to send invoice email" });
      }
      
    } catch (error) {
      console.error("Error sending invoice email:", error);
      res.status(500).json({ message: "Failed to send invoice email" });
    }
  });

  // Send contract email using hybrid approach
  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { contractId, customMessage } = req.body;
      
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

      console.log('📧 Sending contract email with hybrid approach:', contract.contractNumber);
      
      // Use enhanced hybrid email function with PDF attachment + cloud storage
      const { sendContractEmail } = await import('./mailgun-email');
      const success = await sendContractEmail(contract, userSettings, customMessage);
      
      if (success) {
        // Update contract status to "sent" after successful email delivery
        // Note: Cloud storage metadata (URL, key, creation time) is handled by the email function
        await storage.updateContract(contractId, { status: 'sent' }, userId);
        
        // Update booking to reflect contract being sent
        if (contract.enquiryId) {
          await storage.updateBooking(contract.enquiryId, { 
            contractSent: true,
            status: 'contract_sent'
          }, userId);
        }
        
        console.log('✅ Contract status updated to "sent" after successful email delivery');
        res.json({ message: "Contract email sent successfully with PDF attachment and static backup link" });
      } else {
        res.status(500).json({ message: "Failed to send contract email" });
      }
      
    } catch (error) {
      console.error("Error sending contract email:", error);
      res.status(500).json({ message: "Failed to send contract email" });
    }
  });

  // Send contract reminder
  app.post('/api/contracts/:id/send-reminder', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contractId = parseInt(req.params.id);
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Only send reminders for sent contracts that aren't signed yet
      if (contract.status !== 'sent' || contract.signedAt) {
        return res.status(400).json({ message: "Contract reminder not applicable for this status" });
      }
      
      // Get user settings for email branding
      const userSettings = await storage.getUserSettings(userId);
      const fromName = userSettings?.emailFromName || userSettings?.businessName || "MusoBuddy";
      const fromEmail = "noreply@mg.musobuddy.com";
      const replyToEmail = userSettings?.businessEmail || req.user.email;
      
      // Create reminder email
      const contractSignUrl = `${process.env.REPLIT_DOMAIN || 'https://musobuddy.replit.app'}/sign-contract/${contract.id}`;
      const contractViewUrl = `${process.env.REPLIT_DOMAIN || 'https://musobuddy.replit.app'}/view-contract/${contract.id}`;
      
      const emailData: any = {
        to: contract.clientEmail,
        from: `${fromName} <${fromEmail}>`,
        subject: `Contract Reminder: ${contract.contractNumber} - Please Sign`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0EA5E9; margin-bottom: 20px;">Contract Reminder</h1>
            
            <p>Dear ${contract.clientName},</p>
            <p>This is a friendly reminder that your performance contract is ready for signing.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Contract Details</h3>
              <p><strong>Contract:</strong> ${contract.contractNumber}</p>
              <p><strong>Event Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Time:</strong> ${contract.eventTime}</p>
              <p><strong>Venue:</strong> ${contract.venue}</p>
              <p><strong>Fee:</strong> £${contract.fee}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractSignUrl}" style="background: #0EA5E9; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Sign Contract Now</a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px;">
              Please sign your contract at your earliest convenience to confirm your booking.
            </p>
            
            <p>Thank you!</p>
            <p>Best regards,<br><strong>${userSettings?.businessName || fromName}</strong></p>
            
            <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
              <small>Powered by MusoBuddy – less admin, more music</small>
            </p>
          </div>
        `,
        text: `Contract Reminder - ${contract.contractNumber}. Please sign your contract for the event on ${new Date(contract.eventDate).toLocaleDateString('en-GB')} at ${contract.venue}. Sign online: ${contractSignUrl}`
      };
      
      // Add reply-to if user has external email
      if (replyToEmail) {
        emailData.replyTo = replyToEmail;
      }
      
      // Send reminder email
      const { sendEmail } = await import('./mailgun-email');
      const emailSent = await sendEmail(emailData);
      
      if (emailSent) {
        // Update contract reminder tracking
        await storage.updateContract(contractId, { 
          reminderCount: (contract.reminderCount || 0) + 1
        }, userId);
        
        res.json({ 
          message: "Reminder sent successfully",
          debug: {
            contractId: contractId,
            clientEmail: contract.clientEmail,
            contractNumber: contract.contractNumber,
            emailSent: true
          }
        });
      } else {
        res.status(500).json({ 
          message: "Failed to send reminder email",
          debug: {
            contractId: contractId,
            clientEmail: contract.clientEmail,
            contractNumber: contract.contractNumber,
            emailSent: false
          }
        });
      }
    } catch (error) {
      console.error("Error sending contract reminder:", error);
      res.status(500).json({ message: "Failed to send contract reminder" });
    }
  });

  // Regenerate contract signing link (manual on-demand regeneration)
  app.post('/api/contracts/:id/regenerate-link', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contractId = parseInt(req.params.id);
      
      // Get the contract details
      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      if (contract.status === 'signed') {
        return res.status(400).json({ message: "Cannot regenerate link for signed contracts" });
      }

      console.log('🔄 Manual regeneration of signing link for contract:', contract.contractNumber);
      
      // Get user settings for business details
      const userSettings = await storage.getUserSettings(userId);
      
      try {
        const { uploadContractSigningPage, regenerateContractSigningUrl, isCloudStorageConfigured } = await import('./cloud-storage');
        
        if (!isCloudStorageConfigured()) {
          return res.status(500).json({ message: "Cloud storage not configured" });
        }
        
        let newSigningUrl = '';
        let storageKey = '';
        
        if (contract.cloudStorageKey) {
          // Try to regenerate existing URL first
          console.log('🔄 Attempting to regenerate existing signing URL...');
          newSigningUrl = await regenerateContractSigningUrl(contract.cloudStorageKey);
          storageKey = contract.cloudStorageKey;
        }
        
        if (!newSigningUrl) {
          // Create new signing page if regeneration failed
          console.log('🔄 Creating new signing page...');
          const uploadResult = await uploadContractSigningPage(contract, userSettings);
          newSigningUrl = uploadResult.url;
          storageKey = uploadResult.storageKey;
        }
        
        if (newSigningUrl) {
          // Update contract with new signing URL metadata
          await storage.updateContract(contractId, {
            cloudStorageUrl: newSigningUrl,
            cloudStorageKey: storageKey,
            signingUrlCreatedAt: new Date()
          }, userId);
          
          console.log('✅ Signing link regenerated successfully');
          res.json({ 
            message: "Signing link regenerated successfully",
            signingUrl: newSigningUrl
          });
        } else {
          throw new Error('Failed to generate signing URL');
        }
        
      } catch (error) {
        console.error('❌ Failed to regenerate signing link:', error);
        res.status(500).json({ message: "Failed to regenerate signing link" });
      }
    } catch (error) {
      console.error('Error regenerating signing link:', error);
      res.status(500).json({ message: "Internal server error" });
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

  // OPTIONS handler for CORS preflight requests
  app.options('/api/contracts/sign/:id', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.sendStatus(200);
  });

  app.post('/api/contracts/sign/:id', async (req, res) => {
    // Add CORS headers for cloud-hosted signing pages
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    try {
      console.log('🔥 CONTRACT SIGNING: Starting contract signing process');
      console.log('🔥 CONTRACT SIGNING: Request params:', req.params);
      console.log('🔥 CONTRACT SIGNING: Request body:', req.body);
      
      const contractId = parseInt(req.params.id);
      const { signatureName, clientName, signature, clientPhone, clientAddress, venueAddress } = req.body;
      
      // Support both formats: old format (signatureName) and new format (clientName from cloud page)
      const finalSignatureName = signatureName || clientName;
      
      console.log('🔥 CONTRACT SIGNING: Final signature name:', finalSignatureName);
      
      if (!finalSignatureName || !finalSignatureName.trim()) {
        console.log('🔥 CONTRACT SIGNING: ERROR - Signature name is required');
        return res.status(400).json({ message: "Signature name is required" });
      }
      
      // Get contract
      console.log('🔥 CONTRACT SIGNING: Retrieving contract with ID:', contractId);
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        console.log('🔥 CONTRACT SIGNING: ERROR - Contract not found');
        return res.status(404).json({ message: "Contract not found" });
      }
      
      console.log('🔥 CONTRACT SIGNING: Contract retrieved:', contract.contractNumber, 'status:', contract.status);
      
      if (contract.status !== 'sent') {
        console.log('🔥 CONTRACT SIGNING: ERROR - Contract is not available for signing, status:', contract.status);
        return res.status(400).json({ message: "Contract is not available for signing" });
      }
      
      // Get client IP for audit trail
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      
      // Update contract with signature and client-fillable fields
      const signedContract = await storage.signContract(contractId, {
        signatureName: finalSignatureName.trim(),
        clientIP,
        signedAt: new Date(),
        clientPhone: clientPhone?.trim(),
        clientAddress: clientAddress?.trim(),
        venueAddress: venueAddress?.trim()
      });
      
      if (!signedContract) {
        return res.status(500).json({ message: "Failed to sign contract" });
      }
      
      // Update booking to reflect contract being signed
      if (contract.enquiryId) {
        await storage.updateBooking(contract.enquiryId, { 
          contractSigned: true,
          status: 'confirmed'
        }, contract.userId);
      }
      
      // Send confirmation emails with download links (no PDF generation)
      try {
        console.log('🔥 CONTRACT SIGNING: Attempting to retrieve user settings for userId:', contract.userId);
        const userSettings = await storage.getUserSettings(contract.userId);
        console.log('🔥 CONTRACT SIGNING: User settings retrieved successfully:', !!userSettings);
        
        console.log('🔥 CONTRACT SIGNING: Importing sendEmail function...');
        const { sendEmail } = await import('./mailgun-email');
        console.log('🔥 CONTRACT SIGNING: sendEmail function imported successfully');
        
        console.log('🔥 CONTRACT SIGNING: Starting confirmation email process');
        console.log('🔥 CONTRACT SIGNING: User settings:', userSettings);
        console.log('🔥 CONTRACT SIGNING: Contract data:', {
          id: contract.id,
          contractNumber: contract.contractNumber,
          clientName: contract.clientName,
          clientEmail: contract.clientEmail,
          eventDate: contract.eventDate,
          eventTime: contract.eventTime,
          venue: contract.venue,
          fee: contract.fee,
          userId: contract.userId
        });
        
        // Upload signed contract to cloud storage (if configured)
        let cloudStorageUrl: string | null = null;
        const { isCloudStorageConfigured, uploadContractToCloud } = await import('./cloud-storage');
        
        if (isCloudStorageConfigured()) {
          console.log('☁️ Uploading signed contract to cloud storage...');
          const cloudResult = await uploadContractToCloud(signedContract, userSettings);
          
          if (cloudResult.success) {
            cloudStorageUrl = cloudResult.url!;
            
            // Update contract with cloud storage URL
            await storage.updateContractCloudStorage(
              signedContract.id,
              cloudResult.url!,
              cloudResult.key!,
              signedContract.userId
            );
            console.log('✅ Signed contract uploaded to cloud storage successfully');
          } else {
            console.warn('⚠️ Cloud storage upload failed:', cloudResult.error);
          }
        }
        
        // Generate contract URLs - prioritize CloudFlare for signed contracts
        const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
        const contractDownloadUrl = `https://${currentDomain}/api/contracts/${signedContract.id}/download`;
        
        // Use CloudFlare URL for viewing if available, otherwise fall back to app URL
        const contractViewUrl = cloudStorageUrl || `https://${currentDomain}/view-contract/${signedContract.id}`;
        
        console.log('🔥 CONTRACT SIGNING: Domain configuration:', {
          REPLIT_DOMAINS: process.env.REPLIT_DOMAINS,
          currentDomain,
          contractDownloadUrl,
          contractViewUrl,
          cloudStorageUrl,
          usingCloudStorage: !!cloudStorageUrl
        });
        
        // Smart email handling - use authenticated domain for sending, Gmail for replies
        const userBusinessEmail = userSettings?.businessEmail;
        const fromName = userSettings?.emailFromName || userSettings?.businessName || 'MusoBuddy User';
        
        // Always use authenticated domain for FROM to avoid SPF issues
        const fromEmail = 'noreply@mg.musobuddy.com';
        
        // If user has Gmail (or other non-authenticated domain), use it as reply-to
        const replyToEmail = userBusinessEmail && !userBusinessEmail.includes('@musobuddy.com') ? userBusinessEmail : null;
        
        console.log('=== CONTRACT SIGNING CONFIRMATION EMAIL ===');
        console.log('To:', contract.clientEmail);
        console.log('From:', `${fromName} <${fromEmail}>`);
        console.log('Reply-To:', replyToEmail);
        console.log('Contract download URL:', contractDownloadUrl);
        console.log('Contract view URL:', contractViewUrl);
        console.log('User settings:', userSettings);
        console.log('Performer email:', userSettings?.businessEmail);
        
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
                <p><strong>Signed by:</strong> ${finalSignatureName.trim()}</p>
                <p><strong>Signed on:</strong> ${new Date().toLocaleString('en-GB')}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${contractViewUrl}" style="background: #1e40af; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px; border: none; box-shadow: 0 3px 6px rgba(0,0,0,0.2); text-transform: uppercase; letter-spacing: 0.5px;">📄 View Contract Online</a>
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
          text: `Contract ${contract.contractNumber} successfully signed by ${finalSignatureName.trim()}. Event: ${new Date(contract.eventDate).toLocaleDateString('en-GB')} at ${contract.venue}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
        };
        
        // Add reply-to if user has Gmail or other external email
        if (replyToEmail) {
          clientEmailData.replyTo = replyToEmail;
        }
        
        console.log('🔥 CONTRACT SIGNING: Sending client confirmation email...');
        console.log('🔥 CONTRACT SIGNING: Client email data:', {
          to: clientEmailData.to,
          from: clientEmailData.from,
          subject: clientEmailData.subject,
          hasReplyTo: !!clientEmailData.replyTo
        });
        const clientEmailResult = await sendEmail(clientEmailData);
        console.log('🔥 CONTRACT SIGNING: Client email result:', clientEmailResult);
        
        // Enhanced logging for debugging confirmation email issues
        if (!clientEmailResult) {
          console.error('❌ CLIENT CONFIRMATION EMAIL FAILED TO SEND');
          console.error('Email data that failed:', JSON.stringify(clientEmailData, null, 2));
        } else {
          console.log('✅ CLIENT CONFIRMATION EMAIL SENT SUCCESSFULLY');
        }
        
        // Email to performer (business owner) with download link
        // Try multiple email sources for performer notification
        const performerEmail = userSettings?.businessEmail || 
                             userSettings?.email || 
                             (req.user?.claims?.email);
        
        if (performerEmail) {
          const performerEmailData: any = {
            to: performerEmail,
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
                  <p style="margin: 5px 0;">Signed by: ${finalSignatureName.trim()}</p>
                  <p style="margin: 5px 0;">Time: ${new Date().toLocaleString('en-GB')}</p>
                  <p style="margin: 5px 0;">IP: ${clientIP}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${contractViewUrl}" style="background: #1e40af; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 18px; border: none; box-shadow: 0 3px 6px rgba(0,0,0,0.2); text-transform: uppercase; letter-spacing: 0.5px;">📄 View Contract Online</a>
                </div>
                
                <p style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
                  📋 <strong>The signed contract is ready for download when needed.</strong>
                </p>
                
                <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                  <small>Powered by MusoBuddy – less admin, more music</small>
                </p>
              </div>
            `,
            text: `Contract ${contract.contractNumber} signed by ${finalSignatureName.trim()} on ${new Date().toLocaleString('en-GB')}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
          };
          
          // Add reply-to for performer email too
          if (replyToEmail) {
            performerEmailData.replyTo = replyToEmail;
          }
          
          console.log('🔥 CONTRACT SIGNING: Sending performer confirmation email...');
          console.log('🔥 CONTRACT SIGNING: Performer email data:', {
            to: performerEmailData.to,
            from: performerEmailData.from,
            subject: performerEmailData.subject,
            hasReplyTo: !!performerEmailData.replyTo
          });
          const performerEmailResult = await sendEmail(performerEmailData);
          console.log('🔥 CONTRACT SIGNING: Performer email result:', performerEmailResult);
          
          // Enhanced logging for debugging performer confirmation email issues
          if (!performerEmailResult) {
            console.error('❌ PERFORMER CONFIRMATION EMAIL FAILED TO SEND');
            console.error('Email data that failed:', JSON.stringify(performerEmailData, null, 2));
          } else {
            console.log('✅ PERFORMER CONFIRMATION EMAIL SENT SUCCESSFULLY');
          }
        } else {
          console.warn('⚠️ No performer email available - checked businessEmail, email, and user claims');
          console.warn('UserSettings:', userSettings);
          console.warn('User claims:', req.user?.claims);
        }
      } catch (emailError) {
        console.error("❌ CRITICAL ERROR: Failed to send confirmation emails:", emailError);
        console.error("Email error details:", {
          message: emailError.message,
          stack: emailError.stack,
          name: emailError.name,
          status: emailError.status,
          type: emailError.type
        });
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  // Phase 3: Main bookings endpoint - updated to use main bookings table with relations
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bookings = await storage.getBookingsWithRelations(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Create new booking (enquiry)
  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const bookingData = insertEnquirySchema.parse(data);
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Update booking (enquiry)
  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bookingId = parseInt(req.params.id);
      const updateData = { ...req.body };
      
      // Sanitize numeric fields - convert empty strings to null
      const numericFields = ['fee', 'deposit', 'setupTime', 'soundCheckTime', 'packupTime', 'travelTime'];
      numericFields.forEach(field => {
        if (updateData[field] === '' || updateData[field] === undefined) {
          updateData[field] = null;
        } else if (updateData[field] && typeof updateData[field] === 'string') {
          const parsed = parseFloat(updateData[field]);
          updateData[field] = isNaN(parsed) ? null : parsed;
        }
      });
      
      // Convert eventDate string to Date if present
      if (updateData.eventDate && typeof updateData.eventDate === 'string') {
        updateData.eventDate = new Date(updateData.eventDate);
      }
      
      // If status is being set to rejected, delete the booking instead of updating
      if (updateData.status === 'rejected') {
        const deleteResult = await storage.deleteBooking(bookingId, userId);
        if (!deleteResult) {
          return res.status(404).json({ message: "Booking not found" });
        }
        console.log(`🗑️ Booking ${bookingId} rejected and deleted from system`);
        return res.json({ message: "Booking rejected and deleted successfully", deleted: true });
      }
      
      console.log('📝 Updating booking with sanitized data:', updateData);
      const updatedBooking = await storage.updateBooking(bookingId, updateData, userId);
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      res.json(updatedBooking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Delete booking (enquiry)
  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bookingId = parseInt(req.params.id);
      
      const success = await storage.deleteBooking(bookingId, userId);
      if (!success) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  app.get('/api/bookings/upcoming', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bookings = await storage.getUpcomingBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error);
      res.status(500).json({ message: "Failed to fetch upcoming bookings" });
    }
  });

  // Auto-complete past bookings endpoint
  app.post('/api/bookings/auto-complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const updatedCount = await storage.autoCompletePastBookings(userId);
      res.json({ 
        message: `Auto-completed ${updatedCount} past bookings`,
        updatedCount 
      });
    } catch (error) {
      console.error("Error auto-completing past bookings:", error);
      res.status(500).json({ message: "Failed to auto-complete past bookings" });
    }
  });





  // Setup multer for file uploads (re-added for contract learning system)
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Initialize contract service
  const getContractService = () => createContractService(storage);

  // NEW: Contract Learning System Routes

  // Simple PDF storage endpoint - Phase 1 of contract learning system
  app.post('/api/contracts/import-pdf', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { bookingId, contractType = 'unknown' } = req.body;
      const file = req.file;
      
      if (!file || file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Please upload a PDF file' });
      }

      // Upload to Cloudflare R2 storage
      const storageKey = `imported-contracts/${userId}/${Date.now()}-${file.originalname}`;
      const uploadResult = await uploadFileToCloudflare(file.buffer, storageKey, file.mimetype);
      
      if (!uploadResult.success) {
        return res.status(500).json({ 
          error: 'Failed to upload to cloud storage',
          details: uploadResult.error 
        });
      }
      
      // Store metadata and cloud storage information
      const contractData = {
        userId,
        filename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        cloudStorageUrl: uploadResult.url,
        cloudStorageKey: uploadResult.key,
        contractType,
        bookingId: bookingId ? parseInt(bookingId) : null
      };

      const contractRecord = await storage.createImportedContract(contractData);
      
      res.json({
        success: true,
        contract: contractRecord,
        message: 'Contract PDF imported successfully'
      });
    } catch (error) {
      console.error('Error importing contract PDF:', error);
      res.status(500).json({ error: 'Failed to import contract PDF' });
    }
  });

  // Get imported contracts for a user
  app.get('/api/contracts/imported', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contracts = await storage.getImportedContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error('Error fetching imported contracts:', error);
      res.status(500).json({ error: 'Failed to fetch imported contracts' });
    }
  });

  // Get a specific imported contract
  app.get('/api/contracts/imported/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contractId = parseInt(req.params.id);
      const contract = await storage.getImportedContract(contractId, userId);
      
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }
      
      res.json(contract);
    } catch (error) {
      console.error('Error fetching imported contract:', error);
      res.status(500).json({ error: 'Failed to fetch imported contract' });
    }
  });

  // Debug endpoint to examine raw PDF text extraction
  app.post('/api/contracts/debug-text-extraction', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const file = req.file;
      
      if (!file || file.mimetype !== 'application/pdf') {
        return res.status(400).json({ error: 'Please upload a PDF file' });
      }

      console.log('🔍 DEBUG TEXT EXTRACTION for:', file.originalname);

      // Extract text from PDF
      const { extractTextFromPDF } = await import('./pdf-text-extractor');
      const contractText = await extractTextFromPDF(file.buffer);
      
      res.json({
        filename: file.originalname,
        size: file.size,
        extractedTextLength: contractText.length,
        extractedText: contractText,
        preview: contractText.substring(0, 1000)
      });
      
    } catch (error) {
      console.error('Debug text extraction failed:', error);
      res.status(500).json({ error: 'Text extraction failed', details: error.message });
    }
  });

  // AI Contract Parsing - Working Version  
  app.post('/api/contracts/parse-pdf', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;
      
      console.log('🔍 MULTER DEBUG:', {
        hasFile: !!file,
        hasReqFiles: !!req.files,
        bodyKeys: Object.keys(req.body),
        headersContentType: req.headers['content-type'],
        headersContentLength: req.headers['content-length']
      });
      
      if (file) {
        console.log('🔍 FILE DEBUG:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasBuffer: !!file.buffer,
          bufferLength: file.buffer?.length
        });
      }
      
      if (!file) {
        return res.status(400).json({ error: 'Please upload a PDF file' });
      }

      // Extract text from PDF
      const { extractTextFromPDF } = await import('./pdf-text-extractor');
      const contractText = await extractTextFromPDF(file.buffer);
      
      if (!contractText || contractText.trim().length < 50) {
        return res.status(400).json({ error: 'Could not extract text from PDF. Please check the file quality.' });
      }

      // Parse with AI
      const { parseContractWithAI } = await import('./contract-ai-parser');
      const extractedData = await parseContractWithAI(contractText);
      
      // Store uploaded contract
      const storageKey = `parsed-contracts/${userId}/${Date.now()}-${file.originalname}`;
      const uploadResult = await uploadFileToCloudflare(file.buffer, storageKey, file.mimetype);
      
      let contractRecord = null;
      if (uploadResult.success) {
        contractRecord = await storage.createImportedContract({
          userId,
          filename: file.originalname,
          cloudUrl: uploadResult.url || storageKey,
          fileSize: file.size,
          uploadedAt: new Date()
        });
      }

      res.json({
        success: true,
        data: extractedData,
        contractId: contractRecord?.id || null,
        message: `Contract parsed with ${extractedData.confidence}% confidence`
      });
      
    } catch (error) {
      console.error('Contract parsing error:', error);
      res.status(500).json({ 
        error: 'Failed to parse contract',
        details: error.message
      });
    }
  });

  // Test endpoint for debugging contract parsing with the example PDF
  app.post('/api/contracts/test-parse', async (req, res) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Use the Hannah Hope contract PDF from attached_assets
      const pdfPath = path.join(process.cwd(), 'attached_assets', 'L2-Contract-Hiring-a-Solo-Musician - Hannah Hope - 24-10-2025 - signed_1753089259099.pdf');
      
      if (!fs.existsSync(pdfPath)) {
        return res.status(404).json({ error: 'Example contract PDF not found' });
      }
      
      console.log('🔥 TEST PARSING: Using example contract at:', pdfPath);
      
      const pdfBuffer = fs.readFileSync(pdfPath);
      const { extractTextFromPDF } = await import('./pdf-text-extractor');
      const contractText = await extractTextFromPDF(pdfBuffer);
      
      console.log('🔥 TEST PARSING: Text extracted, length:', contractText.length);
      
      const { parseContractWithAI } = await import('./contract-ai-parser');
      const extractedData = await parseContractWithAI(contractText);
      
      console.log('🔥 TEST PARSING: AI extraction completed:', extractedData);
      
      res.json({
        success: true,
        extractedText: contractText.substring(0, 500) + '...', // First 500 chars for debugging
        data: extractedData
      });
    } catch (error) {
      console.error('🔥 TEST PARSING ERROR:', error);
      res.status(500).json({ 
        error: 'Failed to parse test contract',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // END CONTRACT PARSING ROUTES
  // ========================================

  // Compliance document routes
  app.get('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const documents = await storage.getComplianceDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching compliance documents:", error);
      res.status(500).json({ message: "Failed to fetch compliance documents" });
    }
  });

  app.post('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const documentData = insertComplianceDocumentSchema.parse({ ...req.body, userId });
      const document = await storage.createComplianceDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating compliance document:", error);
      res.status(500).json({ message: "Failed to create compliance document" });
    }
  });



  // Send compliance documents to booking client
  app.post('/api/bookings/:bookingId/send-compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bookingId = parseInt(req.params.bookingId);
      const { documentIds, recipientEmail, customMessage } = req.body;

      // Validate inputs
      if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ message: "Document IDs are required" });
      }

      if (!recipientEmail) {
        return res.status(400).json({ message: "Recipient email is required" });
      }

      // Get booking details
      const booking = await storage.getBooking(bookingId, userId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Get user settings for business details
      const userSettings = await storage.getUserSettings(userId);
      const businessName = userSettings?.businessName || userSettings?.emailFromName || 'MusoBuddy User';

      // Get selected compliance documents
      const documents = await Promise.all(
        documentIds.map(async (id: number) => {
          const doc = await storage.getComplianceDocument(id, userId);
          if (!doc) {
            throw new Error(`Document with ID ${id} not found`);
          }
          return doc;
        })
      );

      // Validate that all documents are valid
      const invalidDocuments = documents.filter(doc => doc.status !== 'valid');
      if (invalidDocuments.length > 0) {
        return res.status(400).json({ 
          message: `Cannot send expired or expiring documents: ${invalidDocuments.map(d => d.name).join(', ')}` 
        });
      }

      // Prepare email attachments
      const attachments = documents.map(doc => {
        // Convert data URL to base64 content
        const dataUrlMatch = doc.documentUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!dataUrlMatch) {
          throw new Error(`Invalid document URL format for ${doc.name}`);
        }

        const [, mimeType, base64Content] = dataUrlMatch;
        const fileExtension = mimeType.includes('pdf') ? 'pdf' : 
                            mimeType.includes('image') ? 'jpg' : 'doc';

        return {
          content: base64Content,
          filename: `${doc.name}.${fileExtension}`,
          type: mimeType,
          disposition: 'attachment'
        };
      });

      // Format event date
      const eventDate = new Date(booking.eventDate).toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create email content
      const documentsList = documents.map(doc => `• ${doc.name}`).join('\n');
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Compliance Documents</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Required documentation for your upcoming event</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">Event Details</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                <div>
                  <strong style="color: #4a5568;">Event:</strong><br>
                  ${booking.title}
                </div>
                <div>
                  <strong style="color: #4a5568;">Date:</strong><br>
                  ${eventDate}
                </div>
                <div>
                  <strong style="color: #4a5568;">Venue:</strong><br>
                  ${booking.venue}
                </div>
                <div>
                  <strong style="color: #4a5568;">Performer:</strong><br>
                  ${businessName}
                </div>
              </div>
            </div>

            <div style="margin-bottom: 25px;">
              <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">Attached Documents</h3>
              <div style="background: #f7fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #48bb78;">
                <pre style="margin: 0; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #2d3748; white-space: pre-wrap;">${documentsList}</pre>
              </div>
            </div>

            ${customMessage ? `
              <div style="margin-bottom: 25px;">
                <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">Personal Message</h3>
                <div style="background: #edf2f7; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea;">
                  <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #2d3748; white-space: pre-wrap;">${customMessage}</p>
                </div>
              </div>
            ` : ''}

            <div style="margin-bottom: 25px;">
              <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">Document Information</h3>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a5568;">
                These compliance documents demonstrate that I maintain the necessary insurance coverage, 
                safety certifications, and legal requirements for professional music performance services. 
                All documents are current and valid for the event date.
              </p>
            </div>

            <div style="background: #f0fff4; padding: 20px; border-radius: 8px; border: 1px solid #9ae6b4;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="width: 20px; height: 20px; background: #48bb78; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
                  <span style="color: white; font-size: 12px;">✓</span>
                </div>
                <strong style="color: #276749; font-size: 14px;">Professional Assurance</strong>
              </div>
              <p style="margin: 0; font-size: 13px; color: #22543d; line-height: 1.5;">
                All attached documents are verified and current. If you have any questions about these 
                compliance requirements, please don't hesitate to contact me.
              </p>
            </div>
          </div>
          
          <div style="background: #f7fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 12px; color: #718096;">
              <span style="color: #667eea; font-weight: 500;">Powered by MusoBuddy</span> – less admin, more music
            </p>
          </div>
        </div>
      `;

      const emailText = `
Compliance Documents for ${booking.title}

Event Details:
- Event: ${booking.title}
- Date: ${eventDate}
- Venue: ${booking.venue}
- Performer: ${businessName}

Attached Documents:
${documentsList}

${customMessage ? `Personal Message:\n${customMessage}\n\n` : ''}

Document Information:
These compliance documents demonstrate that I maintain the necessary insurance coverage, 
safety certifications, and legal requirements for professional music performance services. 
All documents are current and valid for the event date.

If you have any questions about these compliance requirements, please don't hesitate to contact me.

---
Powered by MusoBuddy – less admin, more music
      `;

      // Send email using Mailgun
      const { sendEmail } = await import('./mailgun-email');
      
      const emailSuccess = await sendEmail({
        to: recipientEmail,
        from: `${businessName} <noreply@mg.musobuddy.com>`,
        subject: `Compliance Documents - ${booking.title}`,
        text: emailText,
        html: emailHtml,
        replyTo: userSettings?.businessEmail || undefined,
        attachments: attachments
      });

      if (!emailSuccess) {
        throw new Error('Failed to send email');
      }

      res.json({ 
        message: "Compliance documents sent successfully",
        documentsCount: documents.length,
        recipient: recipientEmail 
      });

    } catch (error: any) {
      console.error("Error sending compliance documents:", error);
      res.status(500).json({ 
        message: "Failed to send compliance documents",
        error: error.message 
      });
    }
  });

  // Debug data counts for investigating data loss
  app.get('/api/debug-data-counts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const bookings = await storage.getBookings(userId);
      const enquiries = await storage.getEnquiries(userId);
      const contracts = await storage.getContracts(userId);
      const invoices = await storage.getInvoices(userId);
      
      res.json({
        bookings: bookings.length,
        enquiries: enquiries.length,
        contracts: contracts.length,
        invoices: invoices.length,
        message: 'Data counts retrieved successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting data counts:', error);
      res.status(500).json({ message: 'Failed to get data counts' });
    }
  });

  // Settings routes
  app.get('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const settings = await storage.getUserSettings(userId);
      
      console.log('🔥 SETTINGS GET: Raw settings from database:', JSON.stringify(settings, null, 2));
      
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          businessName: "",
          businessEmail: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          county: "",
          postcode: "",
          phone: "",
          website: "",
          taxNumber: "",
          emailFromName: "",
          nextInvoiceNumber: 1,
          defaultTerms: "",
          bankDetails: "",
          selectedInstruments: [],
          gigTypes: [],
          // Theme defaults
          themeTemplate: "classic",
          themeTone: "professional",
          themeFont: "times",
          themeAccentColor: "#8B5CF6",
          themeLogoUrl: "",
          themeSignatureUrl: "",
          themeBanner: "",
          themeCustomTitle: "Invoice",
          themeShowSetlist: false,
          themeShowRiderNotes: false,
          themeShowQrCode: false,
          themeShowTerms: true,
        });
      }
      
      // Parse JSON fields safely
      let selectedInstruments = [];
      let gigTypes = [];
      
      try {
        if (settings.selectedInstruments) {
          selectedInstruments = JSON.parse(settings.selectedInstruments);
        }
      } catch (e) {
        console.warn('Failed to parse selectedInstruments:', e);
      }
      
      try {
        if (settings.gigTypes) {
          // Handle both array format and set format (PostgreSQL arrays might be stored as sets)
          const gigTypesStr = settings.gigTypes.toString();
          if (gigTypesStr.startsWith('[') && gigTypesStr.endsWith(']')) {
            gigTypes = JSON.parse(gigTypesStr);
          } else if (gigTypesStr.startsWith('{') && gigTypesStr.endsWith('}')) {
            // Convert PostgreSQL set format to array
            const setContent = gigTypesStr.slice(1, -1);
            if (setContent.trim()) {
              gigTypes = setContent.split(',').map(item => item.trim().replace(/^"|"$/g, ''));
            }
          } else {
            gigTypes = [];
          }
        }
      } catch (e) {
        console.warn('Failed to parse gigTypes:', e);
        gigTypes = [];
      }
      
      const responseData = {
        ...settings,
        selectedInstruments,
        gigTypes,
        // Ensure all required fields are present with fallbacks
        businessName: settings.businessName || "",
        businessEmail: settings.businessEmail || "",
        businessAddress: settings.businessAddress || "",
        addressLine1: settings.addressLine1 || "",
        addressLine2: settings.addressLine2 || "",
        city: settings.city || "",
        county: settings.county || "",
        postcode: settings.postcode || "",
        phone: settings.phone || "",
        website: settings.website || "",
        taxNumber: settings.taxNumber || "",
        emailFromName: settings.emailFromName || "",
        defaultTerms: settings.defaultTerms || "",
        bankDetails: settings.bankDetails || "",
        nextInvoiceNumber: settings.nextInvoiceNumber || 1,
        // Theme fields with fallbacks
        themeTemplate: settings.themeTemplate || "classic",
        themeTone: settings.themeTone || "professional",
        themeFont: settings.themeFont || "times",
        themeAccentColor: settings.themeAccentColor || "#8B5CF6",
        themeLogoUrl: settings.themeLogoUrl || "",
        themeSignatureUrl: settings.themeSignatureUrl || "",
        themeBanner: settings.themeBanner || "",
        themeCustomTitle: settings.themeCustomTitle || "Invoice",
        themeShowSetlist: settings.themeShowSetlist || false,
        themeShowRiderNotes: settings.themeShowRiderNotes || false,
        themeShowQrCode: settings.themeShowQrCode || false,
        themeShowTerms: settings.themeShowTerms !== undefined ? settings.themeShowTerms : true,
      };
      
      console.log('🔥 SETTINGS GET: Sending response:', JSON.stringify(responseData, null, 2));
      
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = req.body;
      
      console.log('🔥 SETTINGS API: Received data:', JSON.stringify(data, null, 2));
      
      // Prepare data for storage
      const settingsData = {
        ...data,
        userId,
        // Convert arrays to JSON strings for storage
        selectedInstruments: Array.isArray(data.selectedInstruments) 
          ? JSON.stringify(data.selectedInstruments) 
          : data.selectedInstruments,
        gigTypes: Array.isArray(data.gigTypes) 
          ? JSON.stringify(data.gigTypes) 
          : data.gigTypes,
      };
      
      console.log('🔥 SETTINGS API: Prepared for storage:', JSON.stringify(settingsData, null, 2));
      
      const savedSettings = await storage.upsertUserSettings(settingsData);
      
      console.log('🔥 SETTINGS API: Saved successfully:', savedSettings.id);
      
      // Return the saved settings with parsed JSON fields
      let parsedInstruments = [];
      let parsedGigTypes = [];
      
      try {
        if (savedSettings.selectedInstruments) {
          parsedInstruments = JSON.parse(savedSettings.selectedInstruments);
        }
      } catch (e) {
        console.warn('Failed to parse response selectedInstruments:', e);
      }
      
      try {
        if (savedSettings.gigTypes) {
          parsedGigTypes = JSON.parse(savedSettings.gigTypes);
        }
      } catch (e) {
        console.warn('Failed to parse response gigTypes:', e);
      }
      
      const responseData = {
        ...savedSettings,
        selectedInstruments: parsedInstruments,
        gigTypes: parsedGigTypes,
      };
      
      res.json(responseData);
    } catch (error) {
      console.error("🔥 SETTINGS API ERROR:", error);
      res.status(500).json({ message: "Failed to save settings", error: error.message });
    }
  });

  // Theme preview API endpoint
  app.post('/api/theme-preview', isAuthenticated, async (req: any, res) => {
    try {
      const { 
        template, 
        tone, 
        font, 
        accentColor, 
        customTitle,
        showSetlist,
        showRiderNotes,
        showQrCode,
        showTerms,
        businessName,
        businessAddress,
        businessPhone,
        businessEmail
      } = req.body;
      
      console.log('🎨 Theme preview request:', JSON.stringify(req.body, null, 2));
      
      // Generate sample HTML with theme settings
      const { generateThemePreviewHTML } = await import('./theme-preview-simple');
      const htmlContent = await generateThemePreviewHTML({
        template: template || 'classic',
        tone: tone || 'professional',
        font: font || 'times',
        accentColor: accentColor || '#8B5CF6',
        customTitle: customTitle || 'Invoice',
        showSetlist: !!showSetlist,
        showRiderNotes: !!showRiderNotes,
        showQrCode: !!showQrCode,
        showTerms: showTerms !== false,
        businessName: businessName || 'Your Business',
        businessAddress: businessAddress || 'Your Address',
        businessPhone: businessPhone || 'Your Phone',
        businessEmail: businessEmail || 'your@email.com'
      });
      
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    } catch (error) {
      console.error("Error generating theme preview:", error);
      res.status(500).json({ message: "Failed to generate theme preview" });
    }
  });

  // Global gig types routes
  app.get('/api/global-gig-types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const gigTypes = await storage.getGlobalGigTypes(userId);
      res.json(gigTypes);
    } catch (error) {
      console.error("Error fetching global gig types:", error);
      res.status(500).json({ message: "Failed to fetch gig types" });
    }
  });

  app.post('/api/global-gig-types', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { gigTypes } = req.body;
      
      if (!Array.isArray(gigTypes)) {
        return res.status(400).json({ message: "gigTypes must be an array" });
      }
      
      await storage.saveGlobalGigTypes(userId, gigTypes);
      res.json({ message: "Gig types saved successfully" });
    } catch (error) {
      console.error("Error saving global gig types:", error);
      res.status(500).json({ message: "Failed to save gig types" });
    }
  });

  // Client (Address Book) routes
  app.get('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const clients = await storage.getClients(userId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  // Calendar Import Routes
  


  // Import from Calendar file (.ics file)
  app.post('/api/calendar/import', isAuthenticated, upload.single('icsFile'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      console.log('📥 Calendar import request received');
      console.log('User ID:', userId);
      console.log('File received:', req.file ? 'Yes' : 'No');
      console.log('File details:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      } : 'No file');
      
      if (!req.file) {
        console.log('❌ No file received in request');
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

  // Gig suggestions API route
  app.post('/api/gig-suggestions', isAuthenticated, async (req: any, res) => {
    try {
      const { instruments } = req.body;
      
      if (!instruments || !Array.isArray(instruments) || instruments.length === 0) {
        return res.status(400).json({ error: 'Instruments array is required' });
      }

      // Use the existing OpenAI API key for instrument mapping
      const { OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_INSTRUMENT_MAPPING_KEY || process.env.OPENAI_EMAIL_PARSING_KEY,
      });

      const prompt = `Given these musical instruments: ${instruments.join(', ')}

Generate 8-12 specific gig types that would be perfect for a musician who plays these instruments. Focus on:
- Specific event types (weddings, corporate events, etc.)
- Venue types (restaurants, hotels, etc.)
- Musical styles/genres
- Performance contexts

Return only the gig type names, one per line, no explanations or formatting. Examples:
Wedding Ceremony Music
Corporate Event Background Music
Restaurant Jazz Performances
Hotel Lobby Entertainment`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });

      const gigTypes = response.choices[0]?.message?.content
        ?.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('-'))
        .slice(0, 12) || [];

      res.json({ suggestions: gigTypes });
    } catch (error) {
      console.error('Error generating gig suggestions:', error);
      res.status(500).json({ error: 'Failed to generate gig suggestions' });
    }
  });

  // Data cleanup service routes
  app.get('/api/cleanup/undo-items', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { dataCleanupService } = await import('./data-cleanup-service');
      
      const undoItems = dataCleanupService.getUndoItems(userId);
      res.json({ undoItems });
    } catch (error) {
      console.error('Error fetching undo items:', error);
      res.status(500).json({ error: 'Failed to fetch undo items' });
    }
  });

  app.post('/api/cleanup/undo/:table/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { table, id } = req.params;
      const { dataCleanupService } = await import('./data-cleanup-service');
      
      const success = await dataCleanupService.undoDelete(userId, parseInt(id), table);
      
      if (success) {
        res.json({ message: 'Item restored successfully' });
      } else {
        res.status(400).json({ error: 'Failed to restore item' });
      }
    } catch (error) {
      console.error('Error undoing delete:', error);
      res.status(500).json({ error: 'Failed to undo delete' });
    }
  });

  app.post('/api/cleanup/soft-delete/:table/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { table, id } = req.params;
      const { description } = req.body;
      const { dataCleanupService } = await import('./data-cleanup-service');
      
      const success = await dataCleanupService.softDelete(table, parseInt(id), userId, description);
      
      if (success) {
        res.json({ message: 'Item deleted successfully (can be undone)' });
      } else {
        res.status(400).json({ error: 'Failed to delete item' });
      }
    } catch (error) {
      console.error('Error in soft delete:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  });

  app.post('/api/cleanup/maintenance', isAuthenticated, async (req: any, res) => {
    try {
      const { dataCleanupService } = await import('./data-cleanup-service');
      await dataCleanupService.runMaintenanceCleanup();
      res.json({ message: 'Maintenance cleanup completed' });
    } catch (error) {
      console.error('Error in maintenance cleanup:', error);
      res.status(500).json({ error: 'Failed to run maintenance cleanup' });
    }
  });

  app.post('/api/cleanup/flush-user-data', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { dataCleanupService } = await import('./data-cleanup-service');
      
      await dataCleanupService.flushUserData(userId);
      res.json({ message: 'User data flushed successfully' });
    } catch (error) {
      console.error('Error flushing user data:', error);
      res.status(500).json({ error: 'Failed to flush user data' });
    }
  });

  // Safe maintenance endpoints for checking and cleaning duplicates
  app.get('/api/maintenance/check-duplicates', async (req, res) => {
    try {
      const userId = '43963086'; // Your user ID
      const bookings = await storage.getBookings(userId);
      
      // Group by date and venue to find duplicates
      const groups = {};
      bookings.forEach(booking => {
        const key = `${booking.eventDate}_${booking.venue}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(booking);
      });
      
      const duplicates = [];
      const deadData = [];
      
      // Find duplicates
      Object.entries(groups).forEach(([key, bookings]) => {
        if (bookings.length > 1) {
          // Keep first one, mark others as duplicates
          duplicates.push(...bookings.slice(1));
        }
      });
      
      // Find dead data
      bookings.forEach(booking => {
        if (!booking.venue || booking.venue.trim() === '' || !booking.eventDate) {
          deadData.push(booking);
        }
      });
      
      res.json({
        totalBookings: bookings.length,
        duplicates: duplicates.map(b => ({ id: b.id, client: b.clientName, venue: b.venue, date: b.eventDate })),
        deadData: deadData.map(b => ({ id: b.id, client: b.clientName, venue: b.venue, date: b.eventDate })),
        duplicateCount: duplicates.length,
        deadDataCount: deadData.length
      });
    } catch (error) {
      console.error('Error checking duplicates:', error);
      res.status(500).json({ message: 'Failed to check duplicates' });
    }
  });

  app.post('/api/maintenance/clean-duplicates', async (req, res) => {
    try {
      const userId = '43963086'; // Your user ID
      const bookings = await storage.getBookings(userId);
      
      // Group by date and venue to find duplicates
      const groups = {};
      bookings.forEach(booking => {
        const key = `${booking.eventDate}_${booking.venue}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(booking);
      });
      
      let deletedCount = 0;
      const deletedItems = [];
      
      // Remove duplicates (keep first, remove rest)
      for (const [key, bookings] of Object.entries(groups)) {
        if (bookings.length > 1) {
          const duplicates = bookings.slice(1);
          for (const duplicate of duplicates) {
            const success = await storage.deleteBooking(duplicate.id, userId);
            if (success) {
              deletedCount++;
              deletedItems.push({ id: duplicate.id, client: duplicate.clientName, venue: duplicate.venue });
            }
          }
        }
      }
      
      // Remove dead data
      for (const booking of bookings) {
        if (!booking.venue || booking.venue.trim() === '' || !booking.eventDate) {
          const success = await storage.deleteBooking(booking.id, userId);
          if (success) {
            deletedCount++;
            deletedItems.push({ id: booking.id, client: booking.clientName, venue: booking.venue, reason: 'dead data' });
          }
        }
      }
      
      res.json({
        message: 'Duplicate cleanup completed',
        deletedCount,
        deletedItems
      });
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      res.status(500).json({ message: 'Failed to clean duplicates' });
    }
  });

  // Admin routes are now handled by the auth middleware

  // Admin stats endpoint
  app.get('/api/admin/stats', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Business intelligence dashboard
  app.get('/api/admin/business-intelligence', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const intelligence = await storage.getBusinessIntelligence();
      res.json(intelligence);
    } catch (error) {
      console.error("Error fetching business intelligence:", error);
      res.status(500).json({ message: "Failed to fetch business intelligence" });
    }
  });

  // Revenue analytics
  app.get('/api/admin/revenue-analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const timeframe = req.query.timeframe || '12months';
      const analytics = await storage.getRevenueAnalytics(timeframe);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      res.status(500).json({ message: "Failed to fetch revenue analytics" });
    }
  });

  // Geographic distribution of users
  app.get('/api/admin/geographic-distribution', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const distribution = await storage.getGeographicDistribution();
      res.json(distribution);
    } catch (error) {
      console.error("Error fetching geographic distribution:", error);
      res.status(500).json({ message: "Failed to fetch geographic distribution" });
    }
  });

  // Top performing users
  app.get('/api/admin/top-performers', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const performers = await storage.getTopPerformers(limit);
      res.json(performers);
    } catch (error) {
      console.error("Error fetching top performers:", error);
      res.status(500).json({ message: "Failed to fetch top performers" });
    }
  });

  // System health monitoring
  app.get('/api/admin/system-health', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const health = await storage.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error("Error fetching system health:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  // Platform metrics
  app.get('/api/admin/platform-metrics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const metrics = await storage.getPlatformMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching platform metrics:", error);
      res.status(500).json({ message: "Failed to fetch platform metrics" });
    }
  });

  // Admin users endpoint
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getUsersWithStats();
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create user endpoint
  app.post('/api/admin/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { firstName, lastName, email, password, tier, isAdmin } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: "First name, last name, email, and password are required" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const userData = {
        id: Date.now().toString(), // Generate a unique ID
        firstName,
        lastName,
        email,
        password: hashedPassword,
        tier: tier || 'free',
        isAdmin: isAdmin || false
      };
      
      const user = await storage.createUser(userData);
      
      // Remove password from response
      const { password: _, ...userResponse } = user;
      res.json({ message: "User created successfully", user: userResponse });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Admin bookings endpoint
  app.get('/api/admin/bookings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const bookings = await storage.getRecentBookingsAdmin();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching admin bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Update user tier
  app.patch('/api/admin/users/:id/tier', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { tier } = req.body;
      
      const success = await storage.updateUserTier(id, tier);
      if (success) {
        res.json({ message: "User tier updated successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error updating user tier:", error);
      res.status(500).json({ message: "Failed to update user tier" });
    }
  });

  // Toggle user admin status
  app.patch('/api/admin/users/:id/toggle-admin', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const success = await storage.toggleUserAdmin(id);
      if (success) {
        res.json({ message: "User admin status updated successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error toggling user admin:", error);
      res.status(500).json({ message: "Failed to toggle user admin" });
    }
  });

  // Send user credentials via email
  app.post('/api/admin/users/:id/send-credentials', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { password } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get admin user for "from" field
      const adminUser = await storage.getUser(req.user.id);
      const fromEmail = adminUser?.email || 'admin@musobuddy.com';
      
      const emailContent = `
        <h2>Welcome to MusoBuddy!</h2>
        <p>Your account has been created. Here are your login details:</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <p>You can log in at: <a href="${req.protocol}://${req.get('host')}/login">Login to MusoBuddy</a></p>
        <p>Please change your password after your first login.</p>
        <p>Best regards,<br>MusoBuddy Team</p>
      `;
      
      // Use the mailgun service to send email
      const { sendEmail } = await import('./mailgun-email');
      const emailData = {
        to: user.email,
        from: `MusoBuddy <${fromEmail}>`,
        subject: 'Your MusoBuddy Account Details',
        html: emailContent
      };
      
      const emailResult = await sendEmail(emailData);
      
      if (emailResult) {
        res.json({ message: 'Credentials sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send email' });
      }
    } catch (error) {
      console.error('Error sending credentials:', error);
      res.status(500).json({ message: 'Failed to send credentials' });
    }
  });

  // Update user information
  app.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const updates = req.body;
      
      // Hash password if provided
      if (updates.password) {
        const bcrypt = await import('bcrypt');
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      
      const success = await storage.updateUserInfo(userId, updates);
      if (!success) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ message: 'User updated successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Delete user account
  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUserAccount(id);
      if (success) {
        res.json({ message: "User account deleted successfully" });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ message: "Failed to delete user account" });
    }
  });

  // Feedback routes
  app.get('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.isAdmin ? undefined : req.user.id;
      const feedbackList = await storage.getFeedback(userId);
      res.json(feedbackList);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      res.status(500).json({ message: 'Failed to fetch feedback' });
    }
  });

  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackData = {
        ...req.body,
        userId: req.user.id,
        userAgent: req.get('User-Agent') || '',
      };
      const feedback = await storage.createFeedback(feedbackData);
      res.json(feedback);
    } catch (error) {
      console.error('Error creating feedback:', error);
      res.status(500).json({ message: 'Failed to create feedback' });
    }
  });

  app.patch('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = req.params.id;
      const userId = req.user.isAdmin ? undefined : req.user.id;
      const updates = req.body;
      
      const feedback = await storage.updateFeedback(feedbackId, updates, userId);
      if (!feedback) {
        return res.status(404).json({ message: 'Feedback not found' });
      }
      res.json(feedback);
    } catch (error) {
      console.error('Error updating feedback:', error);
      res.status(500).json({ message: 'Failed to update feedback' });
    }
  });

  app.patch('/api/feedback/:id/status', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const feedbackId = req.params.id;
      const { status, adminNotes } = req.body;
      
      const feedback = await storage.updateFeedbackStatus(feedbackId, status, adminNotes, req.user.id);
      if (!feedback) {
        return res.status(404).json({ message: 'Feedback not found' });
      }
      res.json(feedback);
    } catch (error) {
      console.error('Error updating feedback status:', error);
      res.status(500).json({ message: 'Failed to update feedback status' });
    }
  });

  app.delete('/api/feedback/:id', isAuthenticated, async (req: any, res) => {
    try {
      const feedbackId = req.params.id;
      const userId = req.user.isAdmin ? undefined : req.user.id;
      
      const success = await storage.deleteFeedback(feedbackId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Feedback not found' });
      }
      res.json({ message: 'Feedback deleted successfully' });
    } catch (error) {
      console.error('Error deleting feedback:', error);
      res.status(500).json({ message: 'Failed to delete feedback' });
    }
  });

  // Advanced User Management Routes
  
  // User Activity & Analytics
  app.get('/api/admin/users/:id/activity', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const limit = parseInt(req.query.limit) || 100;
      const activity = await storage.getUserActivity(userId, limit);
      res.json(activity);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({ message: 'Failed to fetch user activity' });
    }
  });

  app.get('/api/admin/users/:id/login-history', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const limit = parseInt(req.query.limit) || 50;
      const history = await storage.getUserLoginHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error('Error fetching login history:', error);
      res.status(500).json({ message: 'Failed to fetch login history' });
    }
  });

  app.get('/api/admin/users/:id/analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const analytics = await storage.getUserAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching user analytics:', error);
      res.status(500).json({ message: 'Failed to fetch user analytics' });
    }
  });

  app.get('/api/admin/system-analytics', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const analytics = await storage.getSystemAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching system analytics:', error);
      res.status(500).json({ message: 'Failed to fetch system analytics' });
    }
  });

  // User Account Management
  app.patch('/api/admin/users/:id/suspend', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { reason } = req.body;
      const success = await storage.suspendUser(userId, reason);
      if (success) {
        res.json({ message: 'User suspended successfully' });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error suspending user:', error);
      res.status(500).json({ message: 'Failed to suspend user' });
    }
  });

  app.patch('/api/admin/users/:id/activate', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const success = await storage.activateUser(userId);
      if (success) {
        res.json({ message: 'User activated successfully' });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error activating user:', error);
      res.status(500).json({ message: 'Failed to activate user' });
    }
  });

  app.patch('/api/admin/users/:id/force-password-change', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const success = await storage.forcePasswordChange(userId);
      if (success) {
        res.json({ message: 'Password change forced successfully' });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error forcing password change:', error);
      res.status(500).json({ message: 'Failed to force password change' });
    }
  });

  app.patch('/api/admin/users/bulk-tier-update', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userIds, tier } = req.body;
      const success = await storage.bulkUpdateUserTiers(userIds, tier);
      if (success) {
        res.json({ message: 'User tiers updated successfully' });
      } else {
        res.status(400).json({ message: 'Failed to update user tiers' });
      }
    } catch (error) {
      console.error('Error bulk updating user tiers:', error);
      res.status(500).json({ message: 'Failed to update user tiers' });
    }
  });

  // Communication Features
  app.post('/api/admin/send-message', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const messageData = {
        ...req.body,
        fromUserId: req.user.id,
      };
      const message = await storage.sendUserMessage(messageData);
      res.json(message);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  app.post('/api/admin/broadcast-announcement', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const announcement = {
        ...req.body,
        fromUserId: req.user.id,
      };
      const success = await storage.broadcastAnnouncement(announcement);
      if (success) {
        res.json({ message: 'Announcement sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send announcement' });
      }
    } catch (error) {
      console.error('Error broadcasting announcement:', error);
      res.status(500).json({ message: 'Failed to broadcast announcement' });
    }
  });

  app.get('/api/user/messages', isAuthenticated, async (req: any, res) => {
    try {
      const messages = await storage.getUserMessages(req.user.id);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching user messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.patch('/api/user/messages/:id/mark-read', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const success = await storage.markMessageAsRead(messageId);
      if (success) {
        res.json({ message: 'Message marked as read' });
      } else {
        res.status(404).json({ message: 'Message not found' });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ message: 'Failed to mark message as read' });
    }
  });

  // Support & Help
  app.post('/api/support/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const ticketData = {
        ...req.body,
        userId: req.user.id,
      };
      const ticket = await storage.createSupportTicket(ticketData);
      res.json(ticket);
    } catch (error) {
      console.error('Error creating support ticket:', error);
      res.status(500).json({ message: 'Failed to create support ticket' });
    }
  });

  app.get('/api/support/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.isAdmin ? undefined : req.user.id;
      const tickets = await storage.getSupportTickets(userId);
      res.json(tickets);
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
  });

  app.patch('/api/admin/support/tickets/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const updates = req.body;
      const success = await storage.updateSupportTicket(ticketId, updates);
      if (success) {
        res.json({ message: 'Support ticket updated successfully' });
      } else {
        res.status(404).json({ message: 'Support ticket not found' });
      }
    } catch (error) {
      console.error('Error updating support ticket:', error);
      res.status(500).json({ message: 'Failed to update support ticket' });
    }
  });

  app.patch('/api/admin/support/tickets/:id/assign', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { adminId } = req.body;
      const success = await storage.assignSupportTicket(ticketId, adminId || req.user.id);
      if (success) {
        res.json({ message: 'Support ticket assigned successfully' });
      } else {
        res.status(404).json({ message: 'Support ticket not found' });
      }
    } catch (error) {
      console.error('Error assigning support ticket:', error);
      res.status(500).json({ message: 'Failed to assign support ticket' });
    }
  });

  // Bulk Operations
  app.get('/api/admin/users/export', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const csvData = await storage.exportUsersToCSV();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send(csvData);
    } catch (error) {
      console.error('Error exporting users:', error);
      res.status(500).json({ message: 'Failed to export users' });
    }
  });

  app.post('/api/admin/users/import', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { csvData } = req.body;
      const result = await storage.importUsersFromCSV(csvData);
      res.json(result);
    } catch (error) {
      console.error('Error importing users:', error);
      res.status(500).json({ message: 'Failed to import users' });
    }
  });

  app.delete('/api/admin/users/bulk-delete', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userIds } = req.body;
      const success = await storage.bulkDeleteUsers(userIds);
      if (success) {
        res.json({ message: 'Users deleted successfully' });
      } else {
        res.status(400).json({ message: 'Failed to delete users' });
      }
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      res.status(500).json({ message: 'Failed to delete users' });
    }
  });

  // Audit & Security
  app.get('/api/admin/audit-logs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const logs = await storage.getSystemAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
  });

  app.get('/api/admin/users/:id/audit-logs', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const logs = await storage.getUserAuditLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      res.status(500).json({ message: 'Failed to fetch user audit logs' });
    }
  });

  // Removed duplicate intelligent-parse endpoint - using unified contract-service.ts system

  // Catch-all route to log any unmatched requests
  app.use('*', (req, res, next) => {
    console.log(`=== UNMATCHED ROUTE: ${req.method} ${req.originalUrl} ===`);
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}
