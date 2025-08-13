import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

// Google Calendar Service for two-way sync
export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  // Initialize with user's refresh token
  async initializeForUser(refreshToken: string) {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ 
      version: 'v3', 
      auth: this.oauth2Client 
    });

    return this;
  }

  // Get authorization URL for OAuth flow
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  // Exchange authorization code for tokens
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  // Create event in Google Calendar from MusoBuddy booking
  async createEventFromBooking(booking: any, calendarId: string = 'primary') {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    // Convert MusoBuddy booking to Google Calendar event
    const event = {
      summary: booking.title || `${booking.clientName} - ${booking.venue}`,
      description: this.buildEventDescription(booking),
      start: {
        dateTime: this.buildDateTime(booking.eventDate, booking.eventTime),
        timeZone: 'Europe/London', // TODO: Make configurable per user
      },
      end: {
        dateTime: this.buildDateTime(booking.eventDate, booking.eventEndTime || booking.eventTime),
        timeZone: 'Europe/London',
      },
      location: booking.venueAddress || booking.venue,
      extendedProperties: {
        private: {
          musobuddyId: booking.id.toString(),
          musobuddyType: 'booking',
        },
      },
      colorId: '9', // Blue color for MusoBuddy events
    };

    try {
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
      });

      console.log('✅ Created Google Calendar event:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create Google Calendar event:', error);
      throw error;
    }
  }

  // Update existing Google Calendar event
  async updateEventFromBooking(googleEventId: string, booking: any, calendarId: string = 'primary') {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    const event = {
      summary: booking.title || `${booking.clientName} - ${booking.venue}`,
      description: this.buildEventDescription(booking),
      start: {
        dateTime: this.buildDateTime(booking.eventDate, booking.eventTime),
        timeZone: 'Europe/London',
      },
      end: {
        dateTime: this.buildDateTime(booking.eventDate, booking.eventEndTime || booking.eventTime),
        timeZone: 'Europe/London',
      },
      location: booking.venueAddress || booking.venue,
      extendedProperties: {
        private: {
          musobuddyId: booking.id.toString(),
          musobuddyType: 'booking',
        },
      },
    };

    try {
      const response = await this.calendar.events.update({
        calendarId,
        eventId: googleEventId,
        requestBody: event,
      });

      console.log('✅ Updated Google Calendar event:', googleEventId);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to update Google Calendar event:', error);
      throw error;
    }
  }

  // Delete event from Google Calendar
  async deleteEvent(googleEventId: string, calendarId: string = 'primary') {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      await this.calendar.events.delete({
        calendarId,
        eventId: googleEventId,
      });

      console.log('✅ Deleted Google Calendar event:', googleEventId);
    } catch (error) {
      console.error('❌ Failed to delete Google Calendar event:', error);
      throw error;
    }
  }

  // Perform full sync - get all events
  async performFullSync(calendarId: string = 'primary') {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    let nextPageToken: string | undefined;
    let allEvents: any[] = [];

    try {
      do {
        const response = await this.calendar.events.list({
          calendarId,
          maxResults: 250,
          singleEvents: true,
          pageToken: nextPageToken,
          showDeleted: true,
          timeMin: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // Last year
          timeMax: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Next year
        });

        allEvents = allEvents.concat(response.data.items || []);
        nextPageToken = response.data.nextPageToken;

      } while (nextPageToken);

      return {
        events: allEvents,
        syncToken: nextPageToken,
      };
    } catch (error) {
      console.error('❌ Full sync failed:', error);
      throw error;
    }
  }

  // Perform incremental sync using sync tokens
  async performIncrementalSync(syncToken: string, calendarId: string = 'primary') {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    try {
      const response = await this.calendar.events.list({
        calendarId,
        syncToken,
        showDeleted: true,
      });

      return {
        events: response.data.items || [],
        syncToken: response.data.nextSyncToken,
      };
    } catch (error) {
      if (error.code === 410) {
        // Sync token expired, perform full sync
        console.log('🔄 Sync token expired, performing full sync');
        return this.performFullSync(calendarId);
      }
      throw error;
    }
  }

  // Setup webhook for real-time notifications
  async setupWebhook(calendarId: string = 'primary', webhookUrl: string) {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    const channelId = uuidv4();

    try {
      const response = await this.calendar.events.watch({
        calendarId,
        requestBody: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          token: process.env.GOOGLE_WEBHOOK_TOKEN,
          expiration: Date.now() + (6 * 24 * 60 * 60 * 1000), // 6 days
        },
      });

      console.log('✅ Webhook channel created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Webhook setup failed:', error);
      throw error;
    }
  }

  // Convert Google Calendar event to MusoBuddy booking format
  convertGoogleEventToBooking(googleEvent: any) {
    return {
      title: googleEvent.summary || 'Imported Event',
      clientName: this.extractClientFromEvent(googleEvent),
      venue: googleEvent.location || '',
      venueAddress: googleEvent.location || '',
      eventDate: new Date(googleEvent.start?.dateTime || googleEvent.start?.date),
      eventTime: this.extractTime(googleEvent.start?.dateTime),
      eventEndTime: this.extractTime(googleEvent.end?.dateTime),
      notes: googleEvent.description || '',
      status: 'confirmed', // Assume imported events are confirmed
      fee: '0.00', // Default fee for imported events
      googleCalendarEventId: googleEvent.id,
      googleCalendarId: googleEvent.organizer?.email || 'primary',
    };
  }

  // Helper method to build event description from booking
  private buildEventDescription(booking: any): string {
    const parts = [];
    
    if (booking.clientName) parts.push(`Client: ${booking.clientName}`);
    if (booking.clientPhone) parts.push(`Phone: ${booking.clientPhone}`);
    if (booking.clientEmail) parts.push(`Email: ${booking.clientEmail}`);
    if (booking.fee) parts.push(`Fee: £${booking.fee}`);
    if (booking.notes) parts.push(`Notes: ${booking.notes}`);
    
    parts.push('\n---\nManaged by MusoBuddy');
    
    return parts.join('\n');
  }

  // Helper method to build ISO datetime string
  private buildDateTime(date: string | Date, time?: string): string {
    const eventDate = new Date(date);
    
    if (time) {
      const [hours, minutes] = time.split(':');
      eventDate.setHours(parseInt(hours), parseInt(minutes));
    }
    
    return eventDate.toISOString();
  }

  // Helper method to extract time from ISO datetime
  private extractTime(isoDateTime?: string): string | null {
    if (!isoDateTime) return null;
    
    const date = new Date(isoDateTime);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  // Helper method to extract client name from Google event
  private extractClientFromEvent(googleEvent: any): string {
    // Try to extract client name from summary or description
    if (googleEvent.summary) {
      // Look for patterns like "John Smith - Wedding" or "Event for Jane Doe"
      const patterns = [
        /^([^-]+)\s*-\s*/, // "John Smith - Wedding"
        /for\s+([^,\n]+)/i, // "Event for Jane Doe"
        /with\s+([^,\n]+)/i, // "Meeting with John"
      ];
      
      for (const pattern of patterns) {
        const match = googleEvent.summary.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
    }
    
    return 'Unknown Client';
  }
}

export default GoogleCalendarService;