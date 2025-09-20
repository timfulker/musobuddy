import type { Express } from "express";
import multer from "multer";
import ical from "ical";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { createClient } from '@supabase/supabase-js';

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

// Get Supabase client - Use same logic as auth middleware
const supabaseUrl = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_URL_PROD
  : process.env.SUPABASE_URL_DEV;
const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_KEY_PROD
  : process.env.SUPABASE_SERVICE_KEY_DEV;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export function registerSimpleCalendarImportRoutes(app: Express) {
  console.log('📅 [SIMPLE CALENDAR] Registering new calendar import routes...');

  // Diagnostic route to check user authentication data
  app.get('/api/calendar/debug-user', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      console.log('🔍 [CALENDAR DEBUG] User from auth middleware:', req.user);

      // Check if user exists in Supabase users table
      if (supabase) {
        const { data: userRecord, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        console.log('🔍 [CALENDAR DEBUG] User in database:', { userRecord, error });

        res.json({
          authUser: req.user,
          databaseUser: userRecord,
          error: error?.message
        });
      } else {
        res.json({ error: 'Supabase not configured' });
      }
    } catch (error) {
      console.error('❌ [CALENDAR DEBUG] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/calendar/import-simple',
    upload.single('icsFile'),
    authenticate,
    async (req: AuthenticatedRequest, res) => {
      try {
        console.log('📅 [SIMPLE CALENDAR] New calendar import started - DEBUG VERSION WITH DETAILED LOGGING');

        // Use the public users table ID (not the Supabase Auth ID)
        const userId = req.user?.id;
        console.log('📅 [SIMPLE CALENDAR] User ID from request:', userId);
        console.log('📅 [SIMPLE CALENDAR] Full user object:', req.user);

        if (!userId) {
          return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        if (!supabase) {
          return res.status(500).json({ error: 'Database not configured' });
        }

        console.log('📅 [SIMPLE CALENDAR] Processing file:', req.file.originalname);

        // Ensure user exists in the users table to satisfy foreign key constraint
        console.log('📅 [SIMPLE CALENDAR] Checking if user exists in users table...');
        try {
          const { data: existingUser, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          console.log('📅 [SIMPLE CALENDAR] User check result:', { existingUser, userCheckError });

          if (userCheckError) {
            console.log('❌ [SIMPLE CALENDAR] Error checking user:', userCheckError.message);
          }

          if (!existingUser) {
            console.log('📅 [SIMPLE CALENDAR] User not found, creating minimal user record...');
            const { error: userCreateError } = await supabase
              .from('users')
              .insert([{
                id: userId,
                email: req.user?.email || 'unknown@example.com',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }])
              .maybeSingle();

            if (userCreateError) {
              console.log('❌ [SIMPLE CALENDAR] Error creating user:', userCreateError.message);
            } else {
              console.log('✅ [SIMPLE CALENDAR] User record created');
            }
          }
        } catch (userError) {
          console.log('⚠️ [SIMPLE CALENDAR] User check/create error:', userError.message);
        }

        // Parse the ICS file
        const icsContent = req.file.buffer.toString('utf8');
        const parsedCalendar = ical.parseICS(icsContent);

        let imported = 0;
        let skipped = 0;
        let errors = 0;

        console.log(`📅 [SIMPLE CALENDAR] Found ${Object.keys(parsedCalendar).length} calendar items`);

        // Process each event
        for (const key in parsedCalendar) {
          const event = parsedCalendar[key];

          // Only process VEVENT types
          if (event.type !== 'VEVENT') {
            continue;
          }

          try {
            // Skip events without a start date
            if (!event.start) {
              skipped++;
              continue;
            }

            const eventDate = new Date(event.start);
            if (isNaN(eventDate.getTime())) {
              errors++;
              continue;
            }

            // Create minimal booking data - only essential fields
            const bookingData = {
              user_id: userId,
              client_name: event.summary || 'Imported Event',
              event_date: eventDate.toISOString().split('T')[0],
              status: 'confirmed',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            // Add optional fields only if they exist
            if (event.location) {
              bookingData.venue = event.location;
            }

            if (!event.start.dateOnly) {
              bookingData.event_time = `${eventDate.getHours().toString().padStart(2, '0')}:${eventDate.getMinutes().toString().padStart(2, '0')}`;
            }

            if (event.description) {
              bookingData.notes = event.description;
            }

            // Direct Supabase insert - bypass all existing systems
            console.log('📅 [SIMPLE CALENDAR] Attempting to insert booking data:', {
              user_id: bookingData.user_id,
              client_name: bookingData.client_name,
              event_date: bookingData.event_date
            });

            const { data, error } = await supabase
              .from('bookings')
              .insert([bookingData])
              .select()
              .maybeSingle();

            if (error) {
              console.error('❌ [SIMPLE CALENDAR] DB Error:', error.message);
              console.error('❌ [SIMPLE CALENDAR] Full error details:', JSON.stringify(error, null, 2));
              console.error('❌ [SIMPLE CALENDAR] User ID being used:', bookingData.user_id);
              errors++;
            } else {
              imported++;
              console.log(`✅ [SIMPLE CALENDAR] Imported: ${event.summary} -> ID: ${data?.id}`);
            }

          } catch (eventError) {
            console.error('❌ [SIMPLE CALENDAR] Event processing error:', eventError.message);
            errors++;
          }
        }

        const message = `Simple import complete: ${imported} imported, ${skipped} skipped, ${errors} errors`;
        console.log(`📊 [SIMPLE CALENDAR] ${message}`);

        res.json({
          success: true,
          imported,
          skipped,
          errors,
          message
        });

      } catch (error) {
        console.error('❌ [SIMPLE CALENDAR] Fatal error:', error);
        res.status(500).json({
          error: 'Calendar import failed',
          details: error.message
        });
      }
    }
  );

  console.log('✅ [SIMPLE CALENDAR] Routes registered successfully');
}