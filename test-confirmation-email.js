/**
 * Test confirmation email sending directly
 */

import { sendEmail } from './server/mailgun-email.ts';

async function testConfirmationEmail() {
  console.log('🧪 Testing confirmation email sending...');
  
  // Test with the exact format used in contract signing confirmation
  const emailData = {
    to: 'test@example.com',
    from: 'MusoBuddy <noreply@mg.musobuddy.com>',
    subject: 'Contract TEST-001 Successfully Signed ✓',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
        
        <p>Dear Test Client,</p>
        <p>Your performance contract <strong>TEST-001</strong> has been successfully signed!</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Event Details</h3>
          <p><strong>Date:</strong> January 15, 2025</p>
          <p><strong>Time:</strong> 7:00 PM</p>
          <p><strong>Venue:</strong> Test Venue</p>
          <p><strong>Fee:</strong> £300</p>
          <p><strong>Signed by:</strong> Test Client</p>
          <p><strong>Signed on:</strong> January 15, 2025</p>
        </div>
        
        <p>This is a test of the confirmation email system.</p>
        
        <p>Best regards,<br><strong>MusoBuddy Test</strong></p>
        
        <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
          <small>Powered by MusoBuddy – less admin, more music</small>
        </p>
      </div>
    `,
    text: 'Contract TEST-001 successfully signed by Test Client. Event: January 15, 2025 at Test Venue.'
  };
  
  console.log('📧 Sending test confirmation email...');
  console.log('To:', emailData.to);
  console.log('From:', emailData.from);
  console.log('Subject:', emailData.subject);
  
  const result = await sendEmail(emailData);
  
  console.log('🔍 Test result:', result);
  console.log(result ? '✅ SUCCESS: Test confirmation email sent' : '❌ FAILED: Test confirmation email failed');
  
  return result;
}

// Run the test
testConfirmationEmail().catch(console.error);