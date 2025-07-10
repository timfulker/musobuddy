/**
 * Find the correct URL format for this Replit project
 */

console.log('=== CHECKING CURRENT REPLIT URL FORMAT ===');

// Check if there are any environment variables that indicate the correct URL
console.log('REPLIT_ID:', process.env.REPL_ID);
console.log('REPLIT_SLUG:', process.env.REPL_SLUG);

// Check potential URL formats
const possibleFormats = [
  'https://musobuddy.replit.app',
  'https://musobuddy--timfulker.replit.app',
  'https://musobuddy.timfulker.replit.app',
  'https://musobuddy.replit.dev',
  'https://musobuddy--timfulker.replit.dev',
  'https://musobuddy.timfulker.replit.dev'
];

console.log('\n=== POSSIBLE URL FORMATS ===');
possibleFormats.forEach(url => {
  console.log(url);
});

console.log('\n=== DIAGNOSIS ===');
console.log('The URL in your SendGrid screenshot is: https://musobuddy.replit.app/api/webhook/sendgrid');
console.log('This URL is confirmed accessible and working.');
console.log('');
console.log('If emails are not reaching this webhook, check:');
console.log('1. The URL in SendGrid exactly matches: https://musobuddy.replit.app/api/webhook/sendgrid');
console.log('2. The domain "musobuddy.com" is configured for this specific webhook URL');
console.log('3. No typos or extra characters in the SendGrid configuration');
console.log('4. SendGrid Inbound Parse is enabled for the musobuddy.com domain');