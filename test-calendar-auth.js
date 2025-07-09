/**
 * Test Google Calendar authentication and calendar fetching
 */

const fetch = require('node-fetch');

async function testCalendarAuth() {
  console.log('Testing Google Calendar authentication...');
  
  try {
    // Test auth endpoint
    const authResponse = await fetch('https://workspace.timfulker.repl.co/api/calendar/google/auth', {
      headers: {
        'Cookie': 'connect.sid=your-session-id' // This would need to be replaced with actual session
      }
    });
    
    console.log('Auth endpoint status:', authResponse.status);
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('Auth URL generated successfully');
      console.log('Auth URL:', authData.authUrl);
    } else {
      console.log('Auth failed:', await authResponse.text());
    }
    
    // Test calendar list endpoint (this will fail without authentication)
    const calendarResponse = await fetch('https://workspace.timfulker.repl.co/api/calendar/google/calendars', {
      headers: {
        'Cookie': 'connect.sid=your-session-id' // This would need to be replaced with actual session
      }
    });
    
    console.log('Calendar list endpoint status:', calendarResponse.status);
    
    if (calendarResponse.ok) {
      const calendars = await calendarResponse.json();
      console.log('Calendars found:', calendars.length);
      calendars.forEach(cal => console.log(`- ${cal.summary}`));
    } else {
      console.log('Calendar list failed:', await calendarResponse.text());
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Instructions for manual testing
console.log('=== Google Calendar Integration Test ===');
console.log('');
console.log('To test the calendar import:');
console.log('1. Update Google Cloud Console OAuth redirect URI to:');
console.log('   https://workspace.timfulker.repl.co/api/calendar/google/callback');
console.log('');
console.log('2. Go to https://workspace.timfulker.repl.co/calendar');
console.log('3. Click "Import Calendar" → "Connect Google Calendar"');
console.log('4. Complete OAuth flow');
console.log('5. Select "tim Fulker gigs" from dropdown');
console.log('6. Click "Import Events"');
console.log('');
console.log('Expected result: All events imported as bookings with contracts');
console.log('');

testCalendarAuth();