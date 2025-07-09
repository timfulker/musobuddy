/**
 * Direct test of Google OAuth URL generation
 */

// Test if Google OAuth credentials are properly configured
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = 'https://workspace.timfulker.repl.co/api/calendar/google/callback';

console.log('Google OAuth Configuration Test:');
console.log('================================');
console.log('Client ID:', GOOGLE_CLIENT_ID ? 'Present' : 'Missing');
console.log('Client Secret:', GOOGLE_CLIENT_SECRET ? 'Present' : 'Missing');
console.log('Redirect URI:', GOOGLE_REDIRECT_URI);

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  // Generate test OAuth URL
  const scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent(scopes.join(' '))}&` +
    `access_type=offline&` +
    `include_granted_scopes=true`;
  
  console.log('\nGenerated OAuth URL:');
  console.log(authUrl);
  console.log('\nTesting if Google OAuth is active...');
  
  // Test if the URL is accessible
  fetch(authUrl.substring(0, 100))
    .then(() => console.log('✅ Google OAuth endpoint appears to be accessible'))
    .catch(err => console.log('❌ Error accessing Google OAuth:', err.message));
} else {
  console.log('❌ Google OAuth credentials not configured');
}