/**
 * Test script to debug Google Calendar access
 */

// Simple test to check if we can access the calendar
async function testGoogleCalendarAccess() {
  try {
    const response = await fetch('http://localhost:5000/api/calendar/google/auth', {
      headers: {
        'Authorization': 'Bearer test-token' // This will fail but we can see what happens
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Google auth URL generated successfully');
      console.log('Auth URL:', data.authUrl);
    } else {
      console.log('Auth response status:', response.status);
      const error = await response.text();
      console.log('Error:', error);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Test function to check environment variables
function checkEnvironmentVariables() {
  console.log('Environment check:');
  console.log('GOOGLE_CLIENT_ID exists:', !!process.env.GOOGLE_CLIENT_ID);
  console.log('GOOGLE_CLIENT_SECRET exists:', !!process.env.GOOGLE_CLIENT_SECRET);
  console.log('Current redirect URI would be: https://workspace.timfulker.repl.co/api/calendar/google/callback');
}

async function main() {
  console.log('=== Google Calendar Access Test ===');
  checkEnvironmentVariables();
  console.log('\n=== Testing Auth Endpoint ===');
  await testGoogleCalendarAccess();
}

main().catch(console.error);