/**
 * Test the exact contract signing confirmation email process
 */

import { sendEmail } from './server/mailgun-email.ts';

async function testContractSigningEmails() {
  console.log('🧪 Testing contract signing confirmation emails...');
  
  // Simulate realistic contract data (similar to real contract)
  const mockContract = {
    id: 999,
    contractNumber: 'TEST-001',
    clientName: 'Test Client',
    clientEmail: 'test@example.com',
    eventDate: '2025-01-25',
    eventTime: '7:00 PM',
    venue: 'Test Venue',
    fee: '300'
  };
  
  // Simulate user settings (similar to real user)
  const mockUserSettings = {
    businessName: 'Test Music Services',
    businessEmail: 'test@example.com',
    emailFromName: 'Test Musician'
  };
  
  // Simulate the exact email data that would be sent
  const fromName = mockUserSettings.emailFromName || mockUserSettings.businessName || 'MusoBuddy User';
  const fromEmail = 'noreply@mg.musobuddy.com';
  const replyToEmail = mockUserSettings.businessEmail && !mockUserSettings.businessEmail.includes('@musobuddy.com') ? mockUserSettings.businessEmail : null;
  
  // Generate URLs (similar to real contract signing)
  const currentDomain = 'musobuddy.replit.app';
  const contractDownloadUrl = `https://${currentDomain}/api/contracts/${mockContract.id}/download`;
  const contractViewUrl = `https://${currentDomain}/view-contract/${mockContract.id}`;
  
  const signatureName = 'Test Client';
  const clientIP = '127.0.0.1';
  
  console.log('📧 Testing CLIENT confirmation email...');
  console.log('From:', `${fromName} <${fromEmail}>`);
  console.log('To:', mockContract.clientEmail);
  console.log('Reply-To:', replyToEmail);
  
  // Client confirmation email (exact format from routes.ts)
  const clientEmailData = {
    to: mockContract.clientEmail,
    from: `${fromName} <${fromEmail}>`,
    subject: `Contract ${mockContract.contractNumber} Successfully Signed ✓`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
        
        <p>Dear ${mockContract.clientName},</p>
        <p>Your performance contract <strong>${mockContract.contractNumber}</strong> has been successfully signed!</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Event Details</h3>
          <p><strong>Date:</strong> ${new Date(mockContract.eventDate).toLocaleDateString('en-GB')}</p>
          <p><strong>Time:</strong> ${mockContract.eventTime}</p>
          <p><strong>Venue:</strong> ${mockContract.venue}</p>
          <p><strong>Fee:</strong> £${mockContract.fee}</p>
          <p><strong>Signed by:</strong> ${signatureName.trim()}</p>
          <p><strong>Signed on:</strong> ${new Date().toLocaleString('en-GB')}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${contractViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
          <a href="${contractDownloadUrl}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
        </div>
        
        <p style="color: #6B7280; font-size: 14px;">
          Your signed contract is ready for download at any time. We look forward to performing at your event!
        </p>
        
        <p>Best regards,<br><strong>${mockUserSettings.businessName || fromName}</strong></p>
        
        <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
          <small>Powered by MusoBuddy – less admin, more music</small>
        </p>
      </div>
    `,
    text: `Contract ${mockContract.contractNumber} successfully signed by ${signatureName.trim()}. Event: ${new Date(mockContract.eventDate).toLocaleDateString('en-GB')} at ${mockContract.venue}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
  };
  
  // Add reply-to if user has Gmail or other external email
  if (replyToEmail) {
    clientEmailData.replyTo = replyToEmail;
  }
  
  const clientResult = await sendEmail(clientEmailData);
  console.log('Client email result:', clientResult);
  
  if (clientResult) {
    console.log('✅ SUCCESS: Client confirmation email sent successfully');
  } else {
    console.error('❌ FAILED: Client confirmation email failed');
  }
  
  // Test performer email too
  if (mockUserSettings.businessEmail) {
    console.log('\n📧 Testing PERFORMER confirmation email...');
    
    const performerEmailData = {
      to: mockUserSettings.businessEmail,
      from: `${fromName} <${fromEmail}>`,
      subject: `Contract ${mockContract.contractNumber} Signed by Client ✓`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed! ✓</h2>
          
          <p>Great news! Contract <strong>${mockContract.contractNumber}</strong> has been signed by ${mockContract.clientName}.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Event Details</h3>
            <p><strong>Date:</strong> ${new Date(mockContract.eventDate).toLocaleDateString('en-GB')}</p>
            <p><strong>Time:</strong> ${mockContract.eventTime}</p>
            <p><strong>Venue:</strong> ${mockContract.venue}</p>
            <p><strong>Fee:</strong> £${mockContract.fee}</p>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; border-left: 4px solid #2196F3; margin: 20px 0;">
            <p style="margin: 0;"><strong>Signature Details:</strong></p>
            <p style="margin: 5px 0;">Signed by: ${signatureName.trim()}</p>
            <p style="margin: 5px 0;">Time: ${new Date().toLocaleString('en-GB')}</p>
            <p style="margin: 5px 0;">IP: ${clientIP}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${contractViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
            <a href="${contractDownloadUrl}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
          </div>
          
          <p style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #4CAF50;">
            📋 <strong>The signed contract is ready for download when needed.</strong>
          </p>
          
          <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
            <small>Powered by MusoBuddy – less admin, more music</small>
          </p>
        </div>
      `,
      text: `Contract ${mockContract.contractNumber} signed by ${signatureName.trim()} on ${new Date().toLocaleString('en-GB')}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`
    };
    
    // Add reply-to for performer email too
    if (replyToEmail) {
      performerEmailData.replyTo = replyToEmail;
    }
    
    const performerResult = await sendEmail(performerEmailData);
    console.log('Performer email result:', performerResult);
    
    if (performerResult) {
      console.log('✅ SUCCESS: Performer confirmation email sent successfully');
    } else {
      console.error('❌ FAILED: Performer confirmation email failed');
    }
  }
  
  console.log('\n🎯 Contract signing email test complete!');
}

// Run the test
testContractSigningEmails().catch(console.error);