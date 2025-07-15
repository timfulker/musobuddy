/**
 * Test Mailgun email sending directly with proper configuration
 */

import formData from 'form-data';
import Mailgun from 'mailgun.js';

async function testMailgunEmailDirect() {
  console.log('🔍 TESTING MAILGUN EMAIL DIRECT');
  console.log('=' .repeat(50));

  try {
    // Check environment variables
    console.log('🔧 Environment Variables:');
    console.log('MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY ? 'Present' : 'Missing');
    console.log('MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    if (!process.env.MAILGUN_API_KEY) {
      console.error('❌ MAILGUN_API_KEY is required');
      return;
    }

    // Initialize Mailgun client
    const mailgun = new Mailgun(formData);
    
    // Use production domain regardless of environment variable
    const domain = 'mg.musobuddy.com';
    console.log('🌐 Using domain:', domain);
    
    // Create client with EU endpoint
    const mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.eu.mailgun.net'
    });
    
    console.log('🔑 Mailgun client initialized');

    // Test email data
    const testEmailData = {
      from: 'Tim Fulker <noreply@mg.musobuddy.com>',
      to: 'timfulkermusic@gmail.com',
      subject: '🔍 Contract Signing Confirmation Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
          
          <p>Dear Test Client,</p>
          <p>Your performance contract <strong>TEST-DEBUG-001</strong> has been successfully signed!</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Event Details</h3>
            <p><strong>Date:</strong> 15/08/2025</p>
            <p><strong>Time:</strong> 19:00</p>
            <p><strong>Venue:</strong> Test Venue</p>
            <p><strong>Fee:</strong> £250</p>
            <p><strong>Signed by:</strong> Test Signature</p>
            <p><strong>Signed on:</strong> ${new Date().toLocaleString('en-GB')}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://musobuddy.replit.app/view-contract/123" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
            <a href="https://musobuddy.replit.app/api/contracts/123/download" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">
            Your signed contract is ready for download at any time. We look forward to performing at your event!
          </p>
          
          <p>Best regards,<br><strong>Tim Fulker</strong></p>
          
          <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
            <small>Powered by MusoBuddy – less admin, more music</small>
          </p>
        </div>
      `,
      text: 'Contract TEST-DEBUG-001 successfully signed. This is a test email to verify the confirmation system is working.',
      'h:Reply-To': 'timfulkermusic@gmail.com'
    };

    console.log('📧 Test email data:');
    console.log('To:', testEmailData.to);
    console.log('From:', testEmailData.from);
    console.log('Subject:', testEmailData.subject);
    console.log('Reply-To:', testEmailData['h:Reply-To']);
    
    // Send email
    console.log('📤 Sending test email...');
    const result = await mg.messages.create(domain, testEmailData);
    
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.id);
    console.log('Status:', result.status);
    
    return true;

  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    console.error('Error details:', error);
    console.error('Error status:', error.status);
    console.error('Error type:', error.type);
    return false;
  }
}

testMailgunEmailDirect();