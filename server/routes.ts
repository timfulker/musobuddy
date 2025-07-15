import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertBookingSchema, insertContractSchema, insertInvoiceSchema, insertComplianceDocumentSchema, insertEmailTemplateSchema, insertClientSchema } from "@shared/schema";
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
      res.json({ error: error.message });
    }
  });

  // Gig suggestions endpoint with AI fallback for unknown instruments
  app.post('/api/gig-suggestions', isAuthenticated, async (req, res) => {
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
        'Booking Management',
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
        bookings: 'Lead management and tracking',
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
          <h3>📝 Booking Management</h3>
          <p>Complete lead tracking from initial contact through booking confirmation. 
          Includes email forwarding system at leads@musobuddy.com for automated booking capture.</p>
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
  app.post('/api/bookings/quick-add', async (req: any, res) => {
    try {
      console.log("Quick-add endpoint hit with data:", req.body);
      console.log("Request body type:", typeof req.body);
      console.log("Request body keys:", Object.keys(req.body || {}));

      // For quick-add, we need to associate with the account owner
      // In a real app, this would be configurable or have a different approach
      const userId = "43963086"; // Your user ID from auth logs

      // Transform Quick Add form data to match booking schema
      const quickAddData = req.body;
      console.log("Client name from body:", quickAddData.clientName);

      const bookingData = {
        userId,
        title: `Booking from ${quickAddData.clientName}`,
        clientName: quickAddData.clientName,
        clientEmail: quickAddData.clientEmail || null,
        clientPhone: quickAddData.clientPhone || null,
        eventDate: quickAddData.eventDate ? new Date(quickAddData.eventDate) : null,
        venue: quickAddData.venue || null,
        estimatedValue: quickAddData.estimatedValue ? quickAddData.estimatedValue.toString() : null,
        notes: quickAddData.notes ? `${quickAddData.notes}\n\nSource: ${quickAddData.source || 'Unknown'}\nContact Method: ${quickAddData.contactMethod || 'Unknown'}\nGig Type: ${quickAddData.gigType || 'Unknown'}` : `Source: ${quickAddData.source || 'Unknown'}\nContact Method: ${quickAddData.contactMethod || 'Unknown'}\nGig Type: ${quickAddData.gigType || 'Unknown'}`,
        status: "new"
      };

      console.log("Transformed booking data:", bookingData);
      console.log("estimatedValue type:", typeof bookingData.estimatedValue);
      console.log("estimatedValue value:", bookingData.estimatedValue);

      // Validate using insertBookingSchema
      const validatedData = insertBookingSchema.parse(bookingData);
      const booking = await storage.createBooking(validatedData);
      console.log("Quick-add booking created:", booking);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking via quick-add:", error);
      console.error("Error details:", error.stack);
      res.status(500).json({ message: "Failed to create booking", error: error.message });
    }
  });

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

  app.get('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const booking = await storage.getBooking(id, userId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
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

      console.log("Processed booking data:", data);

      const bookingData = insertBookingSchema.parse(data);
      const booking = await storage.createBooking(bookingData);

      // Auto-create calendar booking for booking (if it has a date)
      if (booking.eventDate && booking.venue && booking.clientName) {
        try {
          const calendarBookingData = {
            userId: userId,
            contractId: null, // No contract yet
            title: booking.title,
            clientName: booking.clientName,
            eventDate: booking.eventDate,
            eventTime: booking.eventTime || '12:00',
            eventEndTime: booking.eventEndTime,
            performanceDuration: booking.performanceDuration,
            venue: booking.venue,
            fee: parseFloat(booking.estimatedValue || '0'),
            status: 'confirmed', // Show as confirmed in calendar
            notes: `Auto-created from booking #${booking.id}. Status: ${booking.status}${booking.notes ? '. Notes: ' + booking.notes : ''}`
          };

          const calendarBooking = await storage.createCalendarBooking(calendarBookingData);
          console.log(`✅ Auto-created calendar booking #${calendarBooking.id} for booking #${booking.id}`);
        } catch (bookingError) {
          console.error('Failed to auto-create calendar booking:', bookingError);
          // Don't fail the booking creation if calendar booking fails
        }
      }

      // Check for conflicts after creating booking
      const conflictService = new (await import('./conflict-detection')).ConflictDetectionService(storage);
      const { conflicts, analysis } = await conflictService.checkBookingConflicts(booking, userId);

      if (conflicts.length > 0 && analysis) {
        // Save conflict to database for tracking
        await conflictService.saveConflict(userId, booking.id, conflicts[0], analysis);

        // Return booking with conflict information
        res.status(201).json({
          ...booking,
          conflict: {
            detected: true,
            severity: analysis.severity,
            conflictsWith: conflicts.length,
            analysis: analysis
          }
        });
      } else {
        res.status(201).json(booking);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      const booking = await storage.updateBooking(id, updates, userId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);

      // Find and delete any auto-created calendar bookings for this booking
      try {
        const calendarBookings = await storage.getCalendarBookings(userId);
        const relatedBookings = calendarBookings.filter(calendarBooking => 
          calendarBooking.notes && calendarBooking.notes.includes(`Auto-created from booking #${id}`)
        );

        for (const calendarBooking of relatedBookings) {
          await storage.deleteCalendarBooking(calendarBooking.id, userId);
          console.log(`✅ Deleted calendar booking #${calendarBooking.id} for booking #${id}`);
        }
      } catch (bookingError) {
        console.error('Failed to delete related calendar bookings:', bookingError);
        // Don't fail the booking deletion if calendar booking cleanup fails
      }

      const success = await storage.deleteBooking(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting booking:", error);
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  // Transfer existing bookings to calendar (one-time migration)
  app.post('/api/transfer-bookings-to-calendar', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getBookings(userId);
      let transferredCount = 0;
      let skippedCount = 0;

      console.log(`📅 Starting transfer of ${bookings.length} bookings to calendar for user ${userId}`);

      for (const booking of bookings) {
        // Only transfer bookings that have dates and aren't already in calendar
        if (booking.eventDate && booking.venue && booking.clientName) {
          try {
            // Check if this booking already has a calendar booking
            const existingCalendarBookings = await storage.getCalendarBookings(userId);
            const alreadyExists = existingCalendarBookings.some(calendarBooking => 
              calendarBooking.notes && calendarBooking.notes.includes(`Auto-created from booking #${booking.id}`)
            );

            if (!alreadyExists) {
              const calendarBookingData = {
                userId: userId,
                contractId: null,
                title: booking.title,
                clientName: booking.clientName,
                eventDate: booking.eventDate,
                eventTime: booking.eventTime || '12:00',
                eventEndTime: booking.eventEndTime,
                performanceDuration: booking.performanceDuration,
                venue: booking.venue,
                fee: parseFloat(booking.estimatedValue || '0'),
                status: 'confirmed',
                notes: `Auto-created from booking #${booking.id}. Status: ${booking.status}${booking.notes ? '. Notes: ' + booking.notes : ''}`
              };

              await storage.createCalendarBooking(calendarBookingData);
              transferredCount++;
              console.log(`✅ Transferred booking #${booking.id} to calendar`);
            } else {
              skippedCount++;
              console.log(`⏭️ Skipped booking #${booking.id} - already exists in calendar`);
            }
          } catch (error) {
            console.error(`❌ Failed to transfer booking #${booking.id}:`, error);
            skippedCount++;
          }
        } else {
          skippedCount++;
          console.log(`⏭️ Skipped booking #${booking.id} - missing date/venue/client info`);
        }
      }

      console.log(`📅 Transfer complete: ${transferredCount} transferred, ${skippedCount} skipped`);

      res.json({
        success: true,
        message: `Successfully transferred ${transferredCount} bookings to calendar`,
        details: {
          total: bookings.length,
          transferred: transferredCount,
          skipped: skippedCount
        }
      });
    } catch (error) {
      console.error('Error transferring bookings to calendar:', error);
      res.status(500).json({ message: 'Failed to transfer bookings to calendar' });
    }
  });

  // Send response to booking
  app.post('/api/bookings/send-response', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { bookingId, to, subject, body } = req.body;

      // Verify booking belongs to user
      const booking = await storage.getBooking(bookingId, userId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
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
        // Update booking status to indicate response sent
        await storage.updateBooking(bookingId, { 
          status: 'qualified',
          notes: booking.notes ? `${booking.notes}\n\n--- Response sent on ${new Date().toLocaleDateString('en-GB')} ---\nSubject: ${subject}\nMessage: ${body}` : `Response sent on ${new Date().toLocaleDateString('en-GB')}\nSubject: ${subject}\nMessage: ${body}`
        }, userId);

        res.json({ success: true, message: 'Response sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send email response' });
      }
    } catch (error) {
      console.error("Error sending booking response:", error);
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

  // Invoice PDF download route - forces download with Content-Disposition header
  app.get('/api/invoices/:id/download', async (req: any, res) => {
    console.log('Download request for invoice:', req.params.id);

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

  // Bulk contract deletion
  app.post('/api/contracts/bulk-delete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        console.log('🔥 CONTRACT CREATION: User object is missing or invalid');
        return res.status(401).json({ message: "User authentication failed - please log in again" });
      }

      const userId = req.user.claims.sub;
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
      - Email forwarding automatically creates bookings from leads@musobuddy.com
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      console.log("🔥 Backend: User ID:", userId);
      console.log("🔥 Backend: Request body:", JSON.stringify(req.body, null, 2));

      const data = { ...req.body, userId };

      // Convert date strings to Date objects if present
      if (data.dueDate && typeof data.dueDate === 'string') {
        data.