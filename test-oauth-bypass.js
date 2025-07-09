/**
 * Test OAuth bypass for Google Calendar
 * This script tests if we can authenticate without test user restrictions
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = 'https://workspace.timfulker.repl.co/api/calendar/google/callback';

// Test OAuth configuration
async function testOAuthConfiguration() {
  console.log('\n=== Testing OAuth Configuration ===');
  
  // Check credentials
  console.log('Google Client ID:', GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
  console.log('Google Client Secret:', GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
  console.log('Redirect URI:', GOOGLE_REDIRECT_URI);
  
  // Create OAuth client
  const oauth2Client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
  
  // Test auth URL generation with different scopes
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      prompt: 'consent'  // Force consent screen
    });
    
    console.log('\nGenerated OAuth URL:');
    console.log(authUrl);
    
    // Check if we can access Google's OAuth endpoint
    const response = await fetch('https://accounts.google.com/o/oauth2/v2/auth', {
      method: 'HEAD'
    });
    
    console.log('\nGoogle OAuth endpoint status:', response.status);
    
  } catch (error) {
    console.error('Error testing OAuth configuration:', error);
  }
}

// Alternative: Try to configure OAuth for external users
async function suggestOAuthSolution() {
  console.log('\n=== OAuth Solution Suggestions ===');
  console.log('1. Try this direct URL to access OAuth consent screen:');
  console.log('   https://console.cloud.google.com/apis/credentials/consent?project=musobuddy');
  console.log('');
  console.log('2. If that doesn\'t work, try navigating:');
  console.log('   Google Cloud Console → APIs & Services → OAuth consent screen');
  console.log('');
  console.log('3. In OAuth consent screen:');
  console.log('   - Scroll down to "Test users" section');
  console.log('   - Click "ADD USERS"');
  console.log('   - Add: timfulkermusic@gmail.com');
  console.log('   - Save changes');
  console.log('');
  console.log('4. Alternative: Change OAuth consent screen to "External" mode');
  console.log('   - This allows any Google user to authenticate');
  console.log('   - No test users required');
  console.log('');
  console.log('5. If all else fails, we can try a service account approach');
  console.log('   - Uses JSON key file instead of OAuth');
  console.log('   - Requires different authentication flow');
}

// Run tests
async function runTests() {
  try {
    await testOAuthConfiguration();
    await suggestOAuthSolution();
  } catch (error) {
    console.error('Test failed:', error);
  }
}

runTests();