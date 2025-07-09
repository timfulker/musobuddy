import ical from 'ical';
import { storage } from './storage';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  source: 'ics';
  originalId: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  events: CalendarEvent[];
}

// Parse Calendar (.ics) file
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
          source: 'ics',
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

