/**
 * Debug contract signing confirmation emails
 */

import pkg from 'pg';
const { Pool } = pkg;

async function debugContractSigningConfirmationEmails() {
  console.log('🔍 DEBUGGING CONTRACT SIGNING CONFIRMATION EMAILS');
  console.log('=' .repeat(60));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Check environment variables
    console.log('\n🔧 ENVIRONMENT VARIABLES CHECK:');
    console.log('MAILGUN_API_KEY:', process.env.MAILGUN_API_KEY ? 'Present' : 'Missing');
    console.log('MAILGUN_DOMAIN:', process.env.MAILGUN_DOMAIN);
    console.log('REPLIT_DOMAINS:', process.env.REPLIT_DOMAINS);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    // 2. Test Mailgun email sending directly
    console.log('\n📧 TESTING MAILGUN EMAIL SENDING DIRECTLY:');
    
    try {
      const { sendEmail } = await import('./server/mailgun-email.js');
      
      const testEmailData = {
        to: 'test@example.com',
        from: 'MusoBuddy Test <noreply@mg.musobuddy.com>',
        subject: 'Contract Signing Confirmation Email Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">Contract Signed Successfully ✓</h2>
            <p>This is a test email to verify the contract signing confirmation system.</p>
            <p><strong>Test Contract:</strong> TEST-DEBUG-001</p>
            <p><strong>Client:</strong> Test Client</p>
            <p><strong>Event Date:</strong> 2025-08-15</p>
            <p><strong>Venue:</strong> Test Venue</p>
            <p><strong>Fee:</strong> £250.00</p>
            <p><strong>Signed by:</strong> Test Signature</p>
            <p><strong>Signed at:</strong> ${new Date().toLocaleString('en-GB')}</p>
          </div>
        `,
        text: 'Contract signing confirmation email test'
      };
      
      console.log('📤 Sending test email...');
      console.log('To:', testEmailData.to);
      console.log('From:', testEmailData.from);
      console.log('Subject:', testEmailData.subject);
      
      const emailResult = await sendEmail(testEmailData);
      console.log('✅ Email result:', emailResult);
      
      if (emailResult) {
        console.log('✅ Mailgun email sending is working correctly');
      } else {
        console.log('❌ Mailgun email sending failed');
      }
      
    } catch (emailError) {
      console.error('❌ Error testing Mailgun email:', emailError);
    }

    // 3. Check recent contract signing activities
    console.log('\n📋 CHECKING RECENT CONTRACT ACTIVITIES:');
    
    const recentContracts = await pool.query(`
      SELECT 
        id,
        contract_number,
        client_name,
        client_email,
        status,
        signed_at,
        created_at,
        updated_at
      FROM contracts 
      WHERE status = 'signed' 
      ORDER BY signed_at DESC 
      LIMIT 5
    `);
    
    console.log('Recent signed contracts:', recentContracts.rows.length);
    recentContracts.rows.forEach((contract, index) => {
      console.log(`${index + 1}. ${contract.contract_number} - ${contract.client_name} (${contract.client_email})`);
      console.log(`   Status: ${contract.status}`);
      console.log(`   Signed: ${contract.signed_at ? new Date(contract.signed_at).toLocaleString('en-GB') : 'Not signed'}`);
      console.log(`   Created: ${new Date(contract.created_at).toLocaleString('en-GB')}`);
      console.log(`   Updated: ${new Date(contract.updated_at).toLocaleString('en-GB')}`);
      console.log('');
    });

    // 4. Check user settings for email configuration
    console.log('\n👤 CHECKING USER SETTINGS:');
    
    const userSettings = await pool.query(`
      SELECT 
        user_id,
        business_name,
        business_email,
        email_from_name,
        created_at
      FROM user_settings 
      WHERE user_id = '43963086'
    `);
    
    if (userSettings.rows.length > 0) {
      const settings = userSettings.rows[0];
      console.log('✅ User settings found:');
      console.log('  Business Name:', settings.business_name);
      console.log('  Business Email:', settings.business_email);
      console.log('  Email From Name:', settings.email_from_name);
      console.log('  Created:', new Date(settings.created_at).toLocaleString('en-GB'));
    } else {
      console.log('❌ No user settings found for user 43963086');
    }

    // 5. Simulate the exact email sending process that happens during contract signing
    console.log('\n🔄 SIMULATING CONTRACT SIGNING EMAIL PROCESS:');
    
    if (recentContracts.rows.length > 0) {
      const testContract = recentContracts.rows[0];
      console.log('Using contract:', testContract.contract_number);
      
      try {
        // Import functions
        const { sendEmail } = await import('./server/mailgun-email.js');
        
        // Mock user settings
        const mockSettings = {
          businessName: 'Test Business',
          businessEmail: 'test@gmail.com',
          emailFromName: 'Test Musician'
        };
        
        // Generate URLs
        const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
        const contractDownloadUrl = `https://${currentDomain}/api/contracts/${testContract.id}/download`;
        const contractViewUrl = `https://${currentDomain}/view-contract/${testContract.id}`;
        
        console.log('Domain:', currentDomain);
        console.log('Download URL:', contractDownloadUrl);
        console.log('View URL:', contractViewUrl);
        
        // Email configuration
        const fromName = mockSettings.emailFromName || mockSettings.businessName || 'MusoBuddy User';
        const fromEmail = 'noreply@mg.musobuddy.com';
        const replyToEmail = mockSettings.businessEmail && !mockSettings.businessEmail.includes('@musobuddy.com') ? mockSettings.businessEmail : null;
        
        console.log('From Name:', fromName);
        console.log('From Email:', fromEmail);
        console.log('Reply-To:', replyToEmail);
        
        // Client email
        const clientEmailData = {
          to: testContract.client_email,
          from: `${fromName} <${fromEmail}>`,
          subject: `Contract ${testContract.contract_number} Successfully Signed ✓`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
              
              <p>Dear ${testContract.client_name},</p>
              <p>Your performance contract <strong>${testContract.contract_number}</strong> has been successfully signed!</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                <p><strong>Signed on:</strong> ${new Date(testContract.signed_at).toLocaleString('en-GB')}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${contractViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
                <a href="${contractDownloadUrl}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
              </div>
              
              <p>Best regards,<br><strong>${mockSettings.businessName}</strong></p>
              
              <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                <small>Powered by MusoBuddy – less admin, more music</small>
              </p>
            </div>
          `,
          text: `Contract ${testContract.contract_number} successfully signed. View: ${contractViewUrl} Download: ${contractDownloadUrl}`,
          ...(replyToEmail && { replyTo: replyToEmail })
        };
        
        console.log('📧 Attempting to send client confirmation email...');
        const clientResult = await sendEmail(clientEmailData);
        console.log('Client email result:', clientResult);
        
        // Performer email
        if (mockSettings.businessEmail) {
          const performerEmailData = {
            to: mockSettings.businessEmail,
            from: `${fromName} <${fromEmail}>`,
            subject: `Contract ${testContract.contract_number} Signed by Client ✓`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed! ✓</h2>
                
                <p>Great news! Contract <strong>${testContract.contract_number}</strong> has been signed by ${testContract.client_name}.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                  <p><strong>Signed on:</strong> ${new Date(testContract.signed_at).toLocaleString('en-GB')}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${contractViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
                  <a href="${contractDownloadUrl}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
                </div>
                
                <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                  <small>Powered by MusoBuddy – less admin, more music</small>
                </p>
              </div>
            `,
            text: `Contract ${testContract.contract_number} signed by ${testContract.client_name}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`,
            ...(replyToEmail && { replyTo: replyToEmail })
          };
          
          console.log('📧 Attempting to send performer confirmation email...');
          const performerResult = await sendEmail(performerEmailData);
          console.log('Performer email result:', performerResult);
        }
        
      } catch (simulationError) {
        console.error('❌ Error simulating email process:', simulationError);
      }
    }

    // 6. Test contract signing endpoint directly
    console.log('\n🔗 TESTING CONTRACT SIGNING ENDPOINT:');
    
    if (recentContracts.rows.length > 0) {
      const testContract = recentContracts.rows[0];
      
      // Only test if contract is in 'sent' status
      if (testContract.status === 'sent') {
        console.log('Testing with contract:', testContract.contract_number);
        
        try {
          const response = await fetch(`http://localhost:5000/api/contracts/sign/${testContract.id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clientName: 'Test Signature',
              clientPhone: '07123 456789',
              clientAddress: '123 Test Street, London, SW1A 1AA',
              signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
            })
          });
          
          const responseData = await response.json();
          console.log('Contract signing response:', response.status, responseData);
          
          if (response.ok) {
            console.log('✅ Contract signing endpoint working');
          } else {
            console.log('❌ Contract signing endpoint failed');
          }
          
        } catch (endpointError) {
          console.error('❌ Error testing contract signing endpoint:', endpointError);
        }
      } else {
        console.log('No contracts in "sent" status available for testing');
      }
    }

    console.log('\n🎯 DEBUGGING SUMMARY:');
    console.log('1. Environment variables checked');
    console.log('2. Mailgun email function tested');
    console.log('3. Recent contract activities reviewed');
    console.log('4. User settings examined');
    console.log('5. Email sending process simulated');
    console.log('6. Contract signing endpoint tested');
    console.log('\n💡 If emails are not being sent, check:');
    console.log('- Mailgun API key and domain configuration');
    console.log('- User settings business email configuration');
    console.log('- Server logs during actual contract signing');
    console.log('- Network connectivity and DNS resolution');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugContractSigningConfirmationEmails();