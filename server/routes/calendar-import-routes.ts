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

            // Create booking from calendar event with proper user_id
            const bookingData = {
              userId: userId, // Explicitly include user_id
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

            // ENHANCED duplicate checking - multi-layer detection to prevent manual re-imports
            // Since Google Calendar sync is removed, users will manually import .ics files repeatedly
            // We need VERY robust duplicate detection to prevent database pollution
            const existingBookings = await storage.getBookingsByUser(userId);
            const isDuplicate = existingBookings.some(booking => {
              const sameDate = booking.eventDate === bookingData.eventDate;
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
              console.log(`⏭️ Skipping duplicate event: ${event.summary} on ${bookingData.eventDate} at ${eventTime || 'all day'}`);
              skipped++;
              continue;
            }

            // Create the booking - method only takes one parameter (the bookingData with userId included)
            await storage.createBooking(bookingData);
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