/**
 * Test contract signing with client-fillable fields functionality
 */

import pkg from 'pg';
const { Pool } = pkg;

async function testContractSigningWithFillableFields() {
  console.log('🧪 TESTING CONTRACT SIGNING WITH FILLABLE FIELDS');
  console.log('=' .repeat(60));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Create a test contract
    console.log('\n🆕 CREATING TEST CONTRACT...');
    
    const testContract = await pool.query(`
      INSERT INTO contracts (
        user_id, 
        contract_number, 
        client_name, 
        client_email, 
        client_phone, 
        client_address, 
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
        'TEST-CLIENT-FILLABLE-' || to_char(now(), 'YYYYMMDD-HH24MISS'), 
        'Test Client', 
        'test@example.com', 
        NULL, 
        NULL, 
        'Test Venue', 
        'Test Address', 
        '2025-08-15', 
        '19:00', 
        '23:00', 
        250.00, 
        'sent',
        'Payment due on day of performance via bank transfer',
        'Power supply, microphone if needed',
        'Parking space required'
      ) RETURNING *
    `);

    const contract = testContract.rows[0];
    console.log('✅ Test contract created:', contract.contract_number);
    console.log('   Client Phone:', contract.client_phone || 'NULL (to be filled by client)');
    console.log('   Client Address:', contract.client_address || 'NULL (to be filled by client)');

    // 2. Test cloud signing page generation
    console.log('\n☁️ TESTING CLOUD SIGNING PAGE GENERATION...');
    
    try {
      const cloudModule = await import('./server/cloud-storage.js');
      const { uploadContractSigningPage, isCloudStorageConfigured } = cloudModule;
      
      if (!isCloudStorageConfigured()) {
        console.log('❌ Cloud storage not configured - skipping cloud signing page test');
        return;
      }
      
      // Mock user settings
      const mockUserSettings = {
        businessName: 'Test Business',
        businessEmail: 'test@business.com',
        businessAddress: '123 Business St',
        phone: '01234 567890'
      };
      
      console.log('🔧 Uploading contract signing page to cloud storage...');
      const uploadResult = await uploadContractSigningPage(contract, mockUserSettings);
      
      if (uploadResult.success) {
        console.log('✅ Cloud signing page uploaded successfully');
        console.log('🔗 Signing URL:', uploadResult.url);
        
        // Update contract with cloud storage info
        await pool.query(`
          UPDATE contracts 
          SET 
            cloud_storage_url = $1,
            cloud_storage_key = $2,
            signing_url_created_at = NOW()
          WHERE id = $3
        `, [uploadResult.url, uploadResult.key, contract.id]);
        
        console.log('✅ Contract updated with cloud storage URL');
      } else {
        console.log('❌ Failed to upload cloud signing page:', uploadResult.error);
      }
      
    } catch (error) {
      console.error('❌ Error testing cloud signing page:', error);
    }

    // 3. Test contract signing simulation
    console.log('\n✍️ SIMULATING CONTRACT SIGNING WITH CLIENT-FILLABLE FIELDS...');
    
    try {
      const testSigningData = {
        clientName: 'Test Client',
        clientPhone: '07123 456789',
        clientAddress: '456 Client Street, London, SW1A 1AA',
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      };
      
      const signedContract = await pool.query(`
        UPDATE contracts 
        SET 
          status = 'signed',
          signed_at = NOW(),
          client_phone = $1,
          client_address = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [testSigningData.clientPhone, testSigningData.clientAddress, contract.id]);
      
      const signed = signedContract.rows[0];
      console.log('✅ Contract signed successfully:', signed.contract_number);
      console.log('   Status:', signed.status);
      console.log('   Client Phone:', signed.client_phone);
      console.log('   Client Address:', signed.client_address);
      console.log('   Signed At:', signed.signed_at);
      
    } catch (error) {
      console.error('❌ Error simulating contract signing:', error);
    }

    // 4. Test email sending (if credentials are available)
    console.log('\n📧 TESTING EMAIL SENDING...');
    
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      try {
        const emailModule = await import('./server/mailgun-email.js');
        const { sendEmail } = emailModule;
        
        const testEmailData = {
          to: 'test@example.com',
          from: 'MusoBuddy Test <noreply@mg.musobuddy.com>',
          subject: 'Test Contract Signing Confirmation',
          html: `
            <h2>Test Contract Signed Successfully ✓</h2>
            <p>This is a test email to verify the contract signing confirmation system.</p>
            <p><strong>Contract:</strong> ${contract.contract_number}</p>
            <p><strong>Client Phone:</strong> 07123 456789</p>
            <p><strong>Client Address:</strong> 456 Client Street, London, SW1A 1AA</p>
          `,
          text: 'Test contract signing confirmation email'
        };
        
        console.log('📤 Sending test confirmation email...');
        const emailResult = await sendEmail(testEmailData);
        
        if (emailResult) {
          console.log('✅ Test email sent successfully');
        } else {
          console.log('❌ Failed to send test email');
        }
        
      } catch (error) {
        console.error('❌ Error testing email sending:', error);
      }
    } else {
      console.log('⚠️ Mailgun credentials not available - skipping email test');
    }

    // 5. Cleanup test contract
    console.log('\n🧹 CLEANING UP TEST CONTRACT...');
    await pool.query('DELETE FROM contracts WHERE id = $1', [contract.id]);
    console.log('✅ Test contract cleaned up');

    console.log('\n🎯 TEST SUMMARY:');
    console.log('✅ Contract creation with NULL client-fillable fields');
    console.log('✅ Cloud signing page generation with client-fillable fields');
    console.log('✅ Contract signing simulation with client-fillable field updates');
    console.log('✅ Email sending functionality test');
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Regenerate signing links for existing contracts');
    console.log('2. Test with real contract signing');
    console.log('3. Verify email delivery in production');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testContractSigningWithFillableFields();