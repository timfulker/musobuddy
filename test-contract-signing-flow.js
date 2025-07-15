/**
 * Test the complete contract signing flow to identify why confirmation emails aren't sent
 */

import pkg from 'pg';
const { Pool } = pkg;
import fetch from 'node-fetch';

async function testContractSigningFlow() {
  console.log('🔍 TESTING CONTRACT SIGNING FLOW');
  console.log('=' .repeat(50));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Create a test contract in 'sent' status
    console.log('\n🆕 Creating test contract in "sent" status...');
    
    const testContract = await pool.query(`
      INSERT INTO contracts (
        user_id, 
        contract_number, 
        client_name, 
        client_email, 
        venue, 
        venue_address, 
        event_date, 
        event_time, 
        event_end_time, 
        fee, 
        status,
        payment_instructions,
        equipment_requirements,
        special_requirements
      ) VALUES (
        '43963086', 
        'TEST-FLOW-' || to_char(now(), 'YYYYMMDD-HH24MISS'), 
        'Test Flow Client', 
        'timfulkermusic@gmail.com', 
        'Test Venue', 
        'Test Address', 
        '2025-08-15', 
        '19:00', 
        '23:00', 
        300.00, 
        'sent',
        'Payment due on day of performance',
        'Power supply required',
        'Parking needed'
      ) RETURNING *
    `);

    const contract = testContract.rows[0];
    console.log('✅ Test contract created:', contract.contract_number);
    console.log('   Status:', contract.status);
    console.log('   Client Email:', contract.client_email);

    // 2. Test the contract signing API endpoint
    console.log('\n📝 Testing contract signing API endpoint...');
    
    const signingData = {
      clientName: 'Test Flow Client',
      clientPhone: '07123 456789',
      clientAddress: '123 Test Street, London, SW1A 1AA',
      signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    };

    console.log('📤 Sending signing request...');
    console.log('Contract ID:', contract.id);
    console.log('Signing data:', {
      clientName: signingData.clientName,
      clientPhone: signingData.clientPhone,
      clientAddress: signingData.clientAddress,
      hasSignature: !!signingData.signature
    });

    // Test the signing endpoint
    try {
      const response = await fetch(`http://localhost:5000/api/contracts/sign/${contract.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signingData)
      });

      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers));

      const responseData = await response.json();
      console.log('📥 Response data:', responseData);

      if (response.ok) {
        console.log('✅ Contract signing API call successful');
        
        // 3. Verify the contract was updated in the database
        console.log('\n🔍 Verifying contract update in database...');
        
        const updatedContract = await pool.query('SELECT * FROM contracts WHERE id = $1', [contract.id]);
        const updated = updatedContract.rows[0];
        
        console.log('Contract status after signing:', updated.status);
        console.log('Client phone saved:', updated.client_phone);
        console.log('Client address saved:', updated.client_address);
        console.log('Signed at:', updated.signed_at);
        
        if (updated.status === 'signed') {
          console.log('✅ Contract successfully updated to signed status');
        } else {
          console.log('❌ Contract status not updated correctly');
        }
        
      } else {
        console.log('❌ Contract signing API call failed');
        console.log('Error:', responseData);
      }

    } catch (fetchError) {
      console.error('❌ Error calling contract signing endpoint:', fetchError);
    }

    // 4. Check if any emails were sent by examining server logs
    console.log('\n📧 Checking if confirmation emails would be sent...');
    
    // Simulate the email sending process manually
    try {
      const { sendEmail } = await import('./server/mailgun-email.js');
      
      // Get user settings
      const userSettings = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', ['43963086']);
      const settings = userSettings.rows[0];
      
      if (settings) {
        console.log('✅ User settings found:', settings.business_name);
        
        // Generate URLs like the real contract signing process
        const currentDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
        const contractDownloadUrl = `https://${currentDomain}/api/contracts/${contract.id}/download`;
        const contractViewUrl = `https://${currentDomain}/view-contract/${contract.id}`;
        
        console.log('Domain:', currentDomain);
        console.log('Download URL:', contractDownloadUrl);
        console.log('View URL:', contractViewUrl);
        
        // Email configuration
        const fromName = settings.email_from_name || settings.business_name || 'MusoBuddy User';
        const fromEmail = 'noreply@mg.musobuddy.com';
        const replyToEmail = settings.business_email && !settings.business_email.includes('@musobuddy.com') ? settings.business_email : null;
        
        console.log('From Name:', fromName);
        console.log('From Email:', fromEmail);
        console.log('Reply-To:', replyToEmail);
        
        // Test sending client confirmation email
        const clientEmailData = {
          to: contract.client_email,
          from: `${fromName} <${fromEmail}>`,
          subject: `Contract ${contract.contract_number} Successfully Signed ✓`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed Successfully ✓</h2>
              
              <p>Dear ${contract.client_name},</p>
              <p>Your performance contract <strong>${contract.contract_number}</strong> has been successfully signed!</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                <p><strong>Date:</strong> ${new Date(contract.event_date).toLocaleDateString('en-GB')}</p>
                <p><strong>Time:</strong> ${contract.event_time}</p>
                <p><strong>Venue:</strong> ${contract.venue}</p>
                <p><strong>Fee:</strong> £${contract.fee}</p>
                <p><strong>Signed by:</strong> ${signingData.clientName}</p>
                <p><strong>Phone:</strong> ${signingData.clientPhone}</p>
                <p><strong>Address:</strong> ${signingData.clientAddress}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${contractViewUrl}" style="background: #0EA5E9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">View Signed Contract</a>
                <a href="${contractDownloadUrl}" style="background: #6B7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Download PDF</a>
              </div>
              
              <p>Best regards,<br><strong>${settings.business_name}</strong></p>
              
              <p style="text-align: center; color: #6B7280; font-size: 12px; margin-top: 30px;">
                <small>Powered by MusoBuddy – less admin, more music</small>
              </p>
            </div>
          `,
          text: `Contract ${contract.contract_number} successfully signed by ${signingData.clientName}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`,
          ...(replyToEmail && { replyTo: replyToEmail })
        };

        console.log('📧 Testing client confirmation email...');
        const clientResult = await sendEmail(clientEmailData);
        console.log('Client email result:', clientResult);

        // Test sending performer confirmation email
        if (settings.business_email) {
          const performerEmailData = {
            to: settings.business_email,
            from: `${fromName} <${fromEmail}>`,
            subject: `Contract ${contract.contract_number} Signed by Client ✓`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4CAF50; margin-bottom: 20px;">Contract Signed! ✓</h2>
                
                <p>Great news! Contract <strong>${contract.contract_number}</strong> has been signed by ${contract.client_name}.</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #333;">Event Details</h3>
                  <p><strong>Date:</strong> ${new Date(contract.event_date).toLocaleDateString('en-GB')}</p>
                  <p><strong>Time:</strong> ${contract.event_time}</p>
                  <p><strong>Venue:</strong> ${contract.venue}</p>
                  <p><strong>Fee:</strong> £${contract.fee}</p>
                  <p><strong>Client Phone:</strong> ${signingData.clientPhone}</p>
                  <p><strong>Client Address:</strong> ${signingData.clientAddress}</p>
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
            text: `Contract ${contract.contract_number} signed by ${contract.client_name}. View: ${contractViewUrl} Download: ${contractDownloadUrl}`,
            ...(replyToEmail && { replyTo: replyToEmail })
          };

          console.log('📧 Testing performer confirmation email...');
          const performerResult = await sendEmail(performerEmailData);
          console.log('Performer email result:', performerResult);
        }
        
      } else {
        console.log('❌ No user settings found');
      }
      
    } catch (emailError) {
      console.error('❌ Error testing email sending:', emailError);
    }

    // 5. Clean up test contract
    console.log('\n🧹 Cleaning up test contract...');
    await pool.query('DELETE FROM contracts WHERE id = $1', [contract.id]);
    console.log('✅ Test contract cleaned up');

    console.log('\n🎯 FLOW TEST SUMMARY:');
    console.log('1. Test contract created in "sent" status');
    console.log('2. Contract signing API endpoint tested');
    console.log('3. Database update verified');
    console.log('4. Email sending process tested');
    console.log('5. Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testContractSigningFlow();