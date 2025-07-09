import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import ical from 'ical';
import { storage } from './storage';
import type { AuthenticatedRequest } from './auth';

// Google Calendar Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/api/calendar/google/callback`;

// Google Calendar OAuth Client
const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// Calendar API scopes
const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
];

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  source: 'google' | 'apple';
  originalId: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  events: CalendarEvent[];
}

// Generate Google Calendar OAuth URL
export function getGoogleAuthUrl(): string {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google Calendar API credentials are not configured');
  }
  
  console.log('Google OAuth configuration:');
  console.log('- Client ID:', GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
  console.log('- Client Secret:', GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
  console.log('- Redirect URI:', GOOGLE_REDIRECT_URI);
  console.log('- Scopes:', CALENDAR_SCOPES);
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: CALENDAR_SCOPES,
    include_granted_scopes: true
  });
  
  console.log('Generated auth URL:', authUrl);
  return authUrl;
}

// Handle Google OAuth callback
export async function handleGoogleCallback(code: string): Promise<{ tokens: any; userInfo: any }> {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    return {
      tokens,
      userInfo: userInfo.data
    };
  } catch (error) {
    console.error('Google OAuth error:', error);
    throw new Error('Failed to authenticate with Google');
  }
}

// Get Google Calendar lists
export async function getGoogleCalendars(tokens: any): Promise<any[]> {
  try {
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const response = await calendar.calendarList.list();
    const calendars = response.data.items || [];
    
    // Log calendar names for debugging
    console.log('Available Google Calendars:');
    calendars.forEach(cal => {
      console.log(`- ${cal.summary} (ID: ${cal.id})`);
    });
    
    return calendars;
  } catch (error) {
    console.error('Error fetching Google calendars:', error);
    throw new Error('Failed to fetch Google calendars');
  }
}

// Import events from Google Calendar
export async function importGoogleCalendarEvents(
  tokens: any,
  calendarId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ImportResult> {
  try {
    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const timeMin = startDate ? startDate.toISOString() : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = endDate ? endDate.toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    console.log(`Importing from calendar: ${calendarId} from ${timeMin} to ${timeMax}`);

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 1000
    });

    const events = response.data.items || [];
    console.log(`Found ${events.length} events in calendar`);
    
    const importedEvents: CalendarEvent[] = [];
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const event of events) {
      try {
        if (!event.start || !event.end) {
          console.log(`Skipping event without start/end: ${event.summary}`);
          skipped++;
          continue;
        }

        console.log(`Processing event: ${event.summary} at ${event.start.dateTime || event.start.date}`);

        const calendarEvent: CalendarEvent = {
          id: event.id || '',
          title: event.summary || 'Untitled Event',
          description: event.description || '',
          location: event.location || '',
          startTime: new Date(event.start.dateTime || event.start.date || ''),
          endTime: new Date(event.end.dateTime || event.end.date || ''),
          allDay: !event.start.dateTime,
          source: 'google',
          originalId: event.id || ''
        };

        importedEvents.push(calendarEvent);
        imported++;
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error);
        errors.push(`Error processing event ${event.id}: ${error.message}`);
        skipped++;
      }
    }

    return {
      success: true,
      imported,
      skipped,
      errors,
      events: importedEvents
    };
  } catch (error) {
    console.error('Error importing Google calendar events:', error);
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [`Failed to import Google calendar events: ${error.message}`],
      events: []
    };
  }
}

// Parse Apple Calendar (.ics) file
export async function parseAppleCalendar(icsContent: string): Promise<ImportResult> {
  try {
    const parsedCal = ical.parseICS(icsContent);
    const importedEvents: CalendarEvent[] = [];
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const key in parsedCal) {
      const event = parsedCal[key];
      
      try {
        if (event.type !== 'VEVENT') {
          skipped++;
          continue;
        }

        if (!event.start || !event.end) {
          skipped++;
          continue;
        }

        const calendarEvent: CalendarEvent = {
          id: event.uid || key,
          title: event.summary || 'Untitled Event',
          description: event.description || '',
          location: event.location || '',
          startTime: new Date(event.start),
          endTime: new Date(event.end),
          allDay: event.start.length === 8, // All-day events have date format YYYYMMDD
          source: 'apple',
          originalId: event.uid || key
        };

        importedEvents.push(calendarEvent);
        imported++;
      } catch (error) {
        errors.push(`Error processing event ${key}: ${error.message}`);
        skipped++;
      }
    }

    return {
      success: true,
      imported,
      skipped,
      errors,
      events: importedEvents
    };
  } catch (error) {
    console.error('Error parsing Apple calendar:', error);
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [`Failed to parse Apple calendar: ${error.message}`],
      events: []
    };
  }
}

// Convert calendar events to MusoBuddy bookings
export async function convertEventsToBookings(
  userId: string,
  events: CalendarEvent[]
): Promise<{ created: number; skipped: number; errors: string[] }> {
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const event of events) {
    try {
      // Check if booking already exists
      const existingBookings = await storage.getBookings(userId);
      const exists = existingBookings.some(booking => 
        booking.eventDate.getTime() === event.startTime.getTime() &&
        booking.venue === event.location
      );

      if (exists) {
        skipped++;
        continue;
      }

      // Create booking (schema requires contractId to be non-null, so create a temporary contract)
      // First create a minimal contract for the imported event
      const contract = await storage.createContract({
        userId,
        contractNumber: `IMPORT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientName: extractClientName(event.title),
        clientEmail: '',
        eventDate: event.startTime,
        eventTime: event.startTime.toTimeString().slice(0, 5), // "HH:MM" format
        eventEndTime: event.endTime.toTimeString().slice(0, 5), // "HH:MM" format
        performanceDuration: Math.round((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)), // minutes
        venue: event.location || 'Unknown Venue',
        fee: "0",
        deposit: "0",
        terms: `Imported from ${event.source} calendar`,
        status: 'signed' // Mark as signed since it's an existing event
      });

      // Now create the booking with the contract ID
      await storage.createBooking({
        userId,
        contractId: contract.id,
        title: event.title,
        clientName: extractClientName(event.title),
        eventDate: event.startTime,
        eventTime: event.startTime.toTimeString().slice(0, 5), // "HH:MM" format
        eventEndTime: event.endTime.toTimeString().slice(0, 5), // "HH:MM" format
        performanceDuration: Math.round((event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)), // minutes
        venue: event.location || 'Unknown Venue',
        fee: "0",
        status: 'confirmed',
        notes: `Imported from ${event.source} calendar`
      });

      // Create corresponding enquiry
      await storage.createEnquiry({
        userId,
        title: event.title,
        clientName: extractClientName(event.title),
        clientEmail: '',
        eventDate: event.startTime,
        venue: event.location || 'Unknown Venue',
        eventType: 'performance',
        status: 'confirmed',
        notes: `Imported from ${event.source} calendar: ${event.description || ''}`
      });

      created++;
    } catch (error) {
      errors.push(`Error creating booking for event "${event.title}": ${error.message}`);
      skipped++;
    }
  }

  return { created, skipped, errors };
}

// Extract client name from event title
function extractClientName(title: string): string {
  // Simple heuristics to extract client name
  // Users can customize this logic based on their naming conventions
  
  // Remove common prefixes
  const cleaned = title
    .replace(/^(gig|performance|show|event|booking)[\s\-:]/i, '')
    .replace(/[\s\-:](gig|performance|show|event|booking)$/i, '')
    .trim();

  // If title contains " - " or " @ ", use the first part as client name
  if (cleaned.includes(' - ')) {
    return cleaned.split(' - ')[0].trim();
  }
  
  if (cleaned.includes(' @ ')) {
    return cleaned.split(' @ ')[0].trim();
  }

  // Otherwise use the full title
  return cleaned || 'Unknown Client';
}

// Store calendar tokens for user
export async function storeCalendarTokens(userId: string, provider: 'google' | 'apple', tokens: any): Promise<void> {
  try {
    await storage.storeCalendarTokens(userId, provider, tokens);
  } catch (error) {
    console.error('Error storing calendar tokens:', error);
    throw new Error('Failed to store calendar tokens');
  }
}

// Get stored calendar tokens
export async function getCalendarTokens(userId: string, provider: 'google' | 'apple'): Promise<any | null> {
  try {
    const tokenData = await storage.getCalendarTokens(userId, provider);
    return tokenData ? tokenData.tokens : null;
  } catch (error) {
    console.error('Error getting calendar tokens:', error);
    return null;
  }
}