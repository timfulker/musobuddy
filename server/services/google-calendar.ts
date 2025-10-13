import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

// Google Calendar Service for two-way sync
export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      console.error('❌ Missing Google OAuth environment variables:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        hasRedirectUri: !!redirectUri
      });
      throw new Error('Google Calendar service not configured. Missing OAuth credentials.');
    }
    
    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
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
  getAuthUrl(userId?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent to get refresh token
      state: userId, // Pass userId as state to retrieve in callback
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }
  
  // Alias for backward compatibility
  async getTokens(code: string) {
    return this.exchangeCodeForTokens(code);
  }

  // Create event in Google Calendar from MusoBuddy booking
  async createEventFromBooking(booking: any, calendarId: string = 'primary') {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    // Convert MusoBuddy booking to Google Calendar event
    // Field mapping: "Client name - Event type" format (per user preference)
    const summary = booking.clientName && booking.eventType 
      ? `${booking.clientName} - ${booking.eventType}`
      : booking.clientName || booking.title || 'Music Booking';
    
    const event = {
      summary,
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

    // Field mapping: "Client name - Event type" format (per user preference)
    const summary = booking.clientName && booking.eventType 
      ? `${booking.clientName} - ${booking.eventType}`
      : booking.clientName || booking.title || 'Music Booking';
    
    const event = {
      summary,
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

  // Perform full sync - get all events from all calendars
  async performFullSync(calendarId: string = 'primary') {
    if (!this.calendar) {
      throw new Error('Calendar service not initialized');
    }

    let allEvents: any[] = [];

    try {
      // First, get list of all calendars
      const calendarListResponse = await this.calendar.calendarList.list();
      const calendars = calendarListResponse.data.items || [];
      
      console.log(`📚 Found ${calendars.length} calendars to sync from:`);
      calendars.forEach((cal, index) => {
        console.log(`  ${index + 1}. "${cal.summary}" (ID: ${cal.id}, Selected: ${cal.selected}, Primary: ${cal.primary})`);
      });
      
      // Check specifically for Tim Fulker - Gigs calendar
      const timFulkerCal = calendars.find(cal => cal.summary === 'Tim Fulker - Gigs');
      if (timFulkerCal) {
        console.log(`🎯 Found Tim Fulker - Gigs calendar: ID=${timFulkerCal.id}, Selected=${timFulkerCal.selected}`);
      } else {
        console.log(`❌ Tim Fulker - Gigs calendar not found in list!`);
        // Check for similar names
        const similarCals = calendars.filter(cal => 
          (cal.summary || '').toLowerCase().includes('tim') || 
          (cal.summary || '').toLowerCase().includes('fulker') ||
          (cal.summary || '').toLowerCase().includes('gig')
        );
        if (similarCals.length > 0) {
          console.log(`🔍 Similar calendar names found:`);
          similarCals.forEach(cal => console.log(`  - "${cal.summary}" (${cal.id})`));
        }
      }
      
      // Sync events from each calendar
      for (const cal of calendars) {
        // Skip holidays calendars, but be more careful about the selected property
        if (cal.id.includes('#holiday')) {
          console.log(`⏭️ Skipping holiday calendar: ${cal.summary || cal.id}`);
          continue;
        }
        
        // Log all calendar details for debugging
        console.log(`🔍 Calendar details: ${cal.summary || cal.id}`, {
          id: cal.id,
          selected: cal.selected,
          accessRole: cal.accessRole,
          primary: cal.primary
        });
        
        // Only skip if explicitly set to false (not undefined/null)
        if (cal.selected === false) {
          console.log(`⏭️ Skipping unselected calendar: ${cal.summary || cal.id}`);
          continue;
        }
        
        console.log(`📅 Syncing from calendar: ${cal.summary || cal.id} (ID: ${cal.id})`);
        
        // Try both singleEvents settings to see if there's a difference
        // This is a workaround for reported bugs with secondary calendars
        let allCalendarEvents: any[] = [];
        
        for (const singleEventsMode of [false, true]) {
          console.log(`  🔄 Trying singleEvents=${singleEventsMode} for ${cal.summary || cal.id}`);
          let nextPageToken: string | undefined;
          let currentModeEvents: any[] = [];
          
          do {
            const response = await this.calendar.events.list({
              calendarId: cal.id,
              maxResults: 2500, // Increased from 250
              singleEvents: true, // Back to true - the most reliable setting
              pageToken: nextPageToken,
              // Remove showDeleted - might be filtering out events
              timeMin: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years back
              timeMax: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 5 years forward
            });

            const events = response.data.items || [];
            currentModeEvents = currentModeEvents.concat(events);
            nextPageToken = response.data.nextPageToken;

          } while (nextPageToken);
          
          console.log(`  📊 singleEvents=${singleEventsMode} returned ${currentModeEvents.length} events`);
          
          // On first run (singleEvents=false), store events
          if (singleEventsMode === false) {
            allCalendarEvents = currentModeEvents;
          } else {
            // On second run (singleEvents=true), check if we got more events
            if (currentModeEvents.length > allCalendarEvents.length) {
              console.log(`  ⚠️ singleEvents=true found more events (${currentModeEvents.length} vs ${allCalendarEvents.length}), using those instead`);
              allCalendarEvents = currentModeEvents;
            }
          }
        }
        
        const events = allCalendarEvents;
        console.log(`  📋 Final event count for ${cal.summary || cal.id}: ${events.length}`);
        
        // Log events from Tim Fulker - Gigs calendar specifically
        if (cal.summary === 'Tim Fulker - Gigs') {
          console.log(`  🔍 Events in Tim Fulker - Gigs calendar:`);
          events.forEach((event, index) => {
            console.log(`    ${index + 1}. "${event.summary}" on ${event.start?.dateTime || event.start?.date} (Status: ${event.status})`);
          });
          
          // Specific check for June 30, 2026 events
          const june30Events = events.filter(event => {
            const eventDate = event.start?.dateTime || event.start?.date;
            return eventDate && eventDate.includes('2026-06-30');
          });
          console.log(`  📅 Events specifically on June 30, 2026: ${june30Events.length}`);
          june30Events.forEach(event => {
            console.log(`    ✅ "${event.summary}" at ${event.start?.dateTime || event.start?.date}`);
          });
          
          // Check our date range
          const timeMin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
          const timeMax = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString();
          const testDate = new Date('2026-06-30T19:00:00Z');
          console.log(`  📊 Date range check:`);
          console.log(`    Min: ${timeMin}`);
          console.log(`    Max: ${timeMax}`);
          console.log(`    Test Event: ${testDate.toISOString()}`);
          console.log(`    In range: ${testDate >= new Date(timeMin) && testDate <= new Date(timeMax)}`);
        }
        
        // Add calendar info to each event for tracking
        events.forEach(event => {
          event.calendarId = cal.id;
          event.calendarName = cal.summary || cal.id;
        });
        
        allEvents = allEvents.concat(events);
      }

      console.log(`📊 Total events found across all calendars: ${allEvents.length}`);
      
      return {
        events: allEvents,
        syncToken: null, // Can't use sync tokens with multiple calendars
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