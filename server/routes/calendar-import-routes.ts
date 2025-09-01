import type { Express } from "express";
import multer from "multer";
import ical from "ical";
import { authenticateWithFirebase, type AuthenticatedRequest } from '../middleware/firebase-auth';
import { storage } from "../core/storage";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/calendar' || file.originalname.endsWith('.ics')) {
      cb(null, true);
    } else {
      cb(new Error('Only .ics calendar files are allowed'));
    }
  }
});

export function registerCalendarImportRoutes(app: Express) {
  // Debug middleware to check if route is hit
  app.post('/api/calendar/import',
    (req, res, next) => {
      console.log('🔍 Calendar import route hit');
      console.log('🔍 Headers:', req.headers);
      console.log('🔍 Has Authorization header:', !!req.headers.authorization);
      next();
    },
    upload.single('icsFile'),
    authenticateWithFirebase,
    async (req: AuthenticatedRequest, res) => {
      try {
        console.log('✅ Past authentication, user:', req.user?.id);
        const userId = req.user?.id;
        
        if (!userId) {
          console.log('❌ No user ID found after auth');
          return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        console.log('📅 Processing calendar import for user:', userId);
        console.log('📄 File info:', {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        });

        // Parse the ICS file
        const icsContent = req.file.buffer.toString('utf8');
        const parsedCalendar = ical.parseICS(icsContent);

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        // Process each event in the calendar
        for (const key in parsedCalendar) {
          const event = parsedCalendar[key];
          
          // Only process VEVENT types (actual calendar events)
          if (event.type !== 'VEVENT') {
            continue;
          }

          try {
            // Skip events without a start date
            if (!event.start) {
              skipped++;
              continue;
            }

            // Convert event to booking format
            const eventDate = new Date(event.start);
            const endDate = event.end ? new Date(event.end) : null;
            
            // Extract time from datetime
            let eventTime = null;
            if (!event.start.dateOnly) {
              eventTime = `${eventDate.getHours().toString().padStart(2, '0')}:${eventDate.getMinutes().toString().padStart(2, '0')}`;
            }

            // Calculate duration in hours if end time is available
            let duration = null;
            if (endDate && !event.start.dateOnly) {
              const durationMs = endDate.getTime() - eventDate.getTime();
              duration = Math.round(durationMs / (1000 * 60 * 60 * 100)) / 100;
            }

            // Create booking from calendar event
            const bookingData = {
              clientName: event.summary || 'Imported Event',
              clientEmail: event.organizer || '',
              clientPhone: '',
              eventDate: eventDate.toISOString().split('T')[0],
              eventTime: eventTime,
              duration: duration,
              venue: event.location || '',
              venueAddress: event.location || '',
              eventType: 'Imported from Calendar',
              fee: null,
              deposit: null,
              notes: event.description || `Imported from: ${req.file.originalname}`,
              status: 'confirmed' as const,
              source: 'calendar_import'
            };

            // Check for duplicate events (same date, time, and title)
            const existingBookings = await storage.getBookings(userId);
            const isDuplicate = existingBookings.some(booking => 
              booking.eventDate === bookingData.eventDate &&
              booking.eventTime === bookingData.eventTime &&
              booking.clientName === bookingData.clientName
            );

            if (isDuplicate) {
              console.log(`⏭️ Skipping duplicate event: ${event.summary} on ${bookingData.eventDate}`);
              skipped++;
              continue;
            }

            // Create the booking
            await storage.createBooking(userId, bookingData);
            imported++;
            console.log(`✅ Imported event: ${event.summary} on ${bookingData.eventDate}`);

          } catch (eventError) {
            console.error(`❌ Failed to import event ${event.summary}:`, eventError);
            errors++;
          }
        }

        const message = `Successfully imported ${imported} events. Skipped ${skipped} duplicates/invalid. ${errors} errors.`;
        console.log(`📊 Import complete: ${message}`);

        res.json({
          success: true,
          imported,
          skipped,
          errors,
          message
        });

      } catch (error) {
        console.error('❌ Calendar import failed:', error);
        res.status(500).json({ 
          error: 'Failed to import calendar', 
          details: error.message 
        });
      }
    }
  );

  console.log('✅ Calendar import routes configured');
}

export default registerCalendarImportRoutes;