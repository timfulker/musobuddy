import type { Express } from "express";
import multer from "multer";
import ical from "ical";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
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

// Helper functions for enhanced duplicate detection
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  // Simple Levenshtein distance-based similarity
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(0).map(() => Array(str1.length + 1).fill(0));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j - 1][i] + 1,     // deletion
        matrix[j][i - 1] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

function getMinutesDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  
  const minutes1 = h1 * 60 + m1;
  const minutes2 = h2 * 60 + m2;
  
  return minutes1 - minutes2;
}

export function registerCalendarImportRoutes(app: Express) {
  console.log('📅 [CALENDAR ROUTES] Registering calendar import routes...');
  
  // Debug middleware to check if route is hit
  app.post('/api/calendar/import',
    (req, res, next) => {
      console.log('🔍 [CALENDAR IMPORT] Route hit - incoming request');
      console.log('🔍 [CALENDAR IMPORT] Method:', req.method);
      console.log('🔍 [CALENDAR IMPORT] URL:', req.url);
      console.log('🔍 [CALENDAR IMPORT] Content-Type:', req.headers['content-type']);
      console.log('🔍 [CALENDAR IMPORT] Has Authorization header:', !!req.headers.authorization);
      next();
    },
    (req, res, next) => {
      console.log('🔍 [CALENDAR IMPORT] Before multer middleware');
      next();
    },
    upload.single('icsFile'),
    (req, res, next) => {
      console.log('🔍 [CALENDAR IMPORT] After multer middleware');
      console.log('🔍 [CALENDAR IMPORT] File present:', !!req.file);
      if (req.file) {
        console.log('🔍 [CALENDAR IMPORT] File details:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size
        });
      }
      next();
    },
    authenticate,
    async (req: AuthenticatedRequest, res) => {
      try {
        console.log('🚨🚨🚨 CALENDAR IMPORT ROUTE HIT! 🚨🚨🚨');
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
        let notVevent = 0;
        let noStartDate = 0;
        let invalidDate = 0;
        let duplicates = 0;
        let pastEvents = 0;
        
        // Check if we should skip past events (from request body)
        const skipPastEvents = req.body?.skipPastEvents || false;
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today

        console.log(`⚡⚡⚡ STARTING EVENT PROCESSING - Total items: ${Object.keys(parsedCalendar).length}`);

        // Process each event in the calendar
        for (const key in parsedCalendar) {
          const event = parsedCalendar[key];
          
          // Only process VEVENT types (actual calendar events)
          if (event.type !== 'VEVENT') {
            notVevent++;
            continue;
          }

          try {
            // Skip events without a start date
            if (!event.start) {
              console.log(`⏭️ Skipping event without start date: ${event.summary}`);
              noStartDate++;
              skipped++;
              continue;
            }

            // Convert event to booking format
            console.log(`📅 Processing event: ${event.summary}, start: ${event.start}`);
            const eventDate = new Date(event.start);
            const endDate = event.end ? new Date(event.end) : null;
            
            // Check if date parsing worked correctly
            if (isNaN(eventDate.getTime())) {
              console.log(`❌ Failed to parse date for event: ${event.summary}, raw start: ${event.start}`);
              invalidDate++;
              errors++;
              continue;
            }
            
            // Optionally skip past events
            if (skipPastEvents && eventDate < today) {
              console.log(`⏭️ Skipping past event: ${event.summary} on ${eventDate.toISOString().split('T')[0]}`);
              pastEvents++;
              skipped++;
              continue;
            }
            
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

            // Create booking from calendar event with proper user_id
            const bookingData = {
              userId: userId, // Explicitly include user_id
              title: event.summary || 'Imported Event', // REQUIRED field - must be set
              clientName: event.summary || 'Imported Event',
              clientEmail: event.organizer || '',
              clientPhone: '',
              eventDate: eventDate.toISOString().split('T')[0],
              eventTime: eventTime,
              eventEndTime: endDate && !event.start.dateOnly 
                ? `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}` 
                : null,
              performanceDuration: duration ? `${duration} hours` : null,
              venue: event.location || '',
              venueAddress: event.location || '',
              eventType: 'Imported from Calendar',
              fee: null,
              deposit: null,
              notes: event.description || `Imported from: ${req.file.originalname}`,
              status: 'confirmed' as const,
              source: 'calendar_import'
            };
            
            console.log(`📅 Booking data prepared:`, {
              date: bookingData.eventDate,
              time: bookingData.eventTime,
              name: bookingData.clientName,
              venue: bookingData.venue
            });

            // ENHANCED duplicate checking - multi-layer detection to prevent manual re-imports
            // Since Google Calendar sync is removed, users will manually import .ics files repeatedly
            // We need VERY robust duplicate detection to prevent database pollution
            const existingBookings = await storage.getBookings(userId);
            const isDuplicate = existingBookings.some(booking => {
              // Convert booking.eventDate to string for comparison if it's a Date object
              const bookingDateStr = booking.eventDate instanceof Date 
                ? booking.eventDate.toISOString().split('T')[0]
                : booking.eventDate;
              const sameDate = bookingDateStr === bookingData.eventDate;
              const sameTime = booking.eventTime === bookingData.eventTime;
              const sameName = booking.clientName?.toLowerCase().trim() === bookingData.clientName?.toLowerCase().trim();
              const sameVenue = booking.venue?.toLowerCase().trim() === bookingData.venue?.toLowerCase().trim();
              
              // LAYER 1: Exact match (date + time + name)
              if (sameDate && sameTime && sameName) {
                return true;
              }
              
              // LAYER 2: All-day event match (same date + name, no specific time)
              if (sameDate && !bookingData.eventTime && !booking.eventTime && sameName) {
                return true;
              }
              
              // LAYER 3: Fuzzy venue matching for same date/time/name (addresses slight variations)
              if (sameDate && sameTime && sameName && bookingData.venue && booking.venue) {
                const venueSimlarity = calculateSimilarity(bookingData.venue.toLowerCase(), booking.venue.toLowerCase());
                if (venueSimlarity > 0.8) { // 80% similarity threshold
                  return true;
                }
              }
              
              // LAYER 4: Close time match (within 30 minutes) for same date/name
              if (sameDate && sameName && bookingData.eventTime && booking.eventTime) {
                const timeDiff = getMinutesDifference(bookingData.eventTime, booking.eventTime);
                if (Math.abs(timeDiff) <= 30) { // Within 30 minutes
                  return true;
                }
              }
              
              return false;
            });

            if (isDuplicate) {
              console.log(`⏭️ DUPLICATE DETECTED - Skipping: ${event.summary} on ${bookingData.eventDate} at ${bookingData.eventTime || 'all day'}`);
              duplicates++;
              skipped++;
              continue;
            }

            console.log(`✅ No duplicate found, creating booking...`);
            // Create the booking - method only takes one parameter (the bookingData with userId included)
            try {
              const createdBooking = await storage.createBooking(bookingData);
              imported++;
              console.log(`✅ Successfully imported: ${event.summary} on ${bookingData.eventDate} with ID: ${createdBooking?.id}`);
            } catch (dbError) {
              console.error(`❌❌❌ DATABASE ERROR creating booking for "${event.summary}":`, dbError);
              console.error(`❌❌❌ Failed booking data:`, JSON.stringify(bookingData, null, 2));
              errors++;
              continue;
            }

          } catch (eventError) {
            console.error(`❌❌❌ CRITICAL ERROR importing event "${event.summary}":`, eventError);
            console.error(`❌❌❌ Event details:`, { 
              summary: event.summary, 
              dtstart: event.dtstart, 
              dtend: event.dtend,
              location: event.location
            });
            errors++;
          }
        }

        // Get total count of bookings after import
        const totalBookingsAfterImport = await storage.getBookings(userId);
        const totalCount = totalBookingsAfterImport.length;
        
        const message = `Successfully imported ${imported} events. Skipped ${skipped} (${duplicates} duplicates, ${pastEvents} past events, ${noStartDate} no start date, ${notVevent} not events). ${errors} errors (${invalidDate} invalid dates).`;
        console.log(`📊 Import complete: ${message}`);
        console.log(`📊 Breakdown: Total items: ${Object.keys(parsedCalendar).length}, VEVENT: ${Object.keys(parsedCalendar).length - notVevent}, Imported: ${imported}, Duplicates: ${duplicates}, Past Events: ${pastEvents}, No Start: ${noStartDate}, Invalid Date: ${invalidDate}, Other Errors: ${errors - invalidDate}`);
        console.log(`📊 Total bookings in database after import: ${totalCount}`);

        res.json({
          success: true,
          imported,
          skipped,
          errors,
          message,
          totalBookingsInDatabase: totalCount,
          displayNote: totalCount > 70 ? `Note: You have ${totalCount} total bookings in the database. Your display is limited to the 50 most recent past events plus future events. Change this in Settings > Performance.` : null,
          breakdown: {
            totalItems: Object.keys(parsedCalendar).length,
            vevents: Object.keys(parsedCalendar).length - notVevent,
            imported,
            duplicates,
            noStartDate,
            invalidDate,
            notVevent,
            pastEvents,
            otherErrors: errors - invalidDate
          }
        });

      } catch (error) {
        console.error('❌❌❌ FATAL: Calendar import failed:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
          error: 'Failed to import calendar', 
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }
  );

  console.log('✅ Calendar import routes configured');
}

export default registerCalendarImportRoutes;