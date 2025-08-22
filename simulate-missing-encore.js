// Simulate the exact Encore email processing to identify where it gets lost
const emailData = {
  "From": "Joseph <no-reply-message@encoremusicians.com>",
  "To": "Tim Fulker <timfulkermusic@enquiries.musobuddy.com>", 
  "Subject": "Saxophonist needed for wedding evening party in Rodhuish",
  "body-plain": "Reply to this email to respond to Joseph\r\n\r\nHi Tim, you've got a new message from Joseph. \r\n\r\nNew message from Joseph\r\n\r\nSaxophonist needed for wedding evening party in Rodhuish\r\n\r\nHey Tim, \r\n\r\nSorry to chase you, just wanted to check all was good for confirming to play at our wedding? \r\n\r\nWe sent over the booking request yesterday 😊. \r\n\r\nThanks! \r\n\r\nJoe",
  "sender": "pm_bounces@pm.mtasv.net",
  "recipient": "timfulkermusic@enquiries.musobuddy.com"
};

console.log('🔍 ANALYZING ENCORE EMAIL PROCESSING');
console.log('=====================================');

// Test the classification logic that should detect this as Encore follow-up
const fromField = emailData.From || emailData.sender || '';
const subjectField = emailData.Subject || '';
const bodyField = emailData['body-plain'] || '';

console.log('📧 Email Details:');
console.log('- From:', fromField);
console.log('- Subject:', subjectField);
console.log('- Body preview:', bodyField.substring(0, 100) + '...');

// Check Encore detection
const isFromEncore = fromField.toLowerCase().includes('encore');
const hasJobAlert = subjectField.toLowerCase().includes('job alert');
const hasApplyNow = bodyField.toLowerCase().includes('apply now');

console.log('\n🎵 Encore Detection:');
console.log('- Is from Encore:', isFromEncore);
console.log('- Has "job alert":', hasJobAlert);
console.log('- Has "apply now":', hasApplyNow);

// Test follow-up detection keywords
const followupKeywords = [
  'congratulations',
  'you have been selected', 
  'client has chosen',
  'booking confirmed',
  'booking update',
  'payment',
  'cancelled',
  'rescheduled'
];

const hasFollowupKeywords = followupKeywords.some(keyword => 
  bodyField.toLowerCase().includes(keyword)
);

console.log('- Has follow-up keywords:', hasFollowupKeywords);
console.log('- Matching keywords:', followupKeywords.filter(k => bodyField.toLowerCase().includes(k)));

// Test the full classification
const isEncoreFollowup = (
  isFromEncore && 
  !hasJobAlert &&
  !hasApplyNow &&
  hasFollowupKeywords
);

console.log('\n✅ Final Classification:');
console.log('- Should be detected as Encore follow-up:', isEncoreFollowup);

if (!isEncoreFollowup) {
  console.log('\n❌ PROBLEM IDENTIFIED:');
  if (!isFromEncore) {
    console.log('- Not detected as from Encore');
    console.log('- Check if "encore" appears in:', fromField.toLowerCase());
  }
  if (hasJobAlert) {
    console.log('- Incorrectly classified as job alert due to subject');
  }
  if (hasApplyNow) {
    console.log('- Incorrectly filtered out due to "apply now" in body');
  }
  if (!hasFollowupKeywords) {
    console.log('- No follow-up keywords found in body');
    console.log('- Available keywords:', followupKeywords);
  }
  
  console.log('\n💡 LIKELY PROCESSING PATH:');
  console.log('- This email would be processed as a regular new inquiry');
  console.log('- It would go to the email queue for AI parsing');
  console.log('- If AI parsing fails, it would go to unparseable_messages');
  
  // Check if this is actually a conversation reply pattern
  const hasReplyPattern = (
    bodyField.toLowerCase().includes('sorry to chase') ||
    bodyField.toLowerCase().includes('sent over the booking request') ||
    bodyField.toLowerCase().includes('check all was good')
  );
  
  console.log('- Has conversation reply pattern:', hasReplyPattern);
  if (hasReplyPattern) {
    console.log('🚨 This should be treated as a conversation reply, not a new inquiry!');
  }
}

console.log('\n🔧 RECOMMENDED FIXES:');
console.log('1. Update Encore detection to include "encoremusicians.com" domain check');
console.log('2. Add conversation reply pattern detection'); 
console.log('3. Check deployed server has latest Encore processing logic');