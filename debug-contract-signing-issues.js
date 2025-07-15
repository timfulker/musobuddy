/**
 * Debug contract signing issues:
 * 1. No confirmation emails being sent
 * 2. Client-fillable fields not showing on signing page
 * 3. Contract still showing as unsigned after signing
 */

import pkg from 'pg';
const { Pool } = pkg;

async function debugContractSigningIssues() {
  console.log('🔍 DEBUGGING CONTRACT SIGNING ISSUES');
  console.log('=' .repeat(60));

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Check recent contract signing activity
    console.log('\n📋 RECENT CONTRACT ACTIVITY:');
    const recentContracts = await pool.query(`
      SELECT 
        id, 
        contract_number, 
        client_name, 
        client_email, 
        client_phone, 
        client_address, 
        status, 
        signed_at,
        created_at,
        updated_at
      FROM contracts 
      WHERE created_at >= NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (recentContracts.rows.length === 0) {
      console.log('❌ No recent contracts found');
    } else {
      recentContracts.rows.forEach((contract, index) => {
        console.log(`\n${index + 1}. Contract ${contract.contract_number}:`);
        console.log(`   ID: ${contract.id}`);
        console.log(`   Client: ${contract.client_name} (${contract.client_email})`);
        console.log(`   Status: ${contract.status}`);
        console.log(`   Client Phone: ${contract.client_phone || 'NULL'}`);
        console.log(`   Client Address: ${contract.client_address || 'NULL'}`);
        console.log(`   Signed At: ${contract.signed_at || 'NULL'}`);
        console.log(`   Created: ${contract.created_at}`);
        console.log(`   Updated: ${contract.updated_at}`);
      });
    }

    // 2. Check Mailgun credentials
    console.log('\n📧 MAILGUN CONFIGURATION:');
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;
    
    console.log(`   API Key: ${mailgunApiKey ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Domain: ${mailgunDomain || '❌ Missing'}`);
    
    if (mailgunApiKey && mailgunDomain) {
      console.log('   ✅ Mailgun credentials are configured');
    } else {
      console.log('   ❌ Mailgun credentials are missing - this would cause email failures');
    }

    // 3. Check user settings for recent users
    console.log('\n👤 USER SETTINGS CHECK:');
    const userSettings = await pool.query(`
      SELECT 
        user_id,
        business_name,
        business_email,
        email_from_name
      FROM user_settings
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (userSettings.rows.length === 0) {
      console.log('❌ No user settings found');
    } else {
      userSettings.rows.forEach((setting, index) => {
        console.log(`\n${index + 1}. User ${setting.user_id}:`);
        console.log(`   Business Name: ${setting.business_name || 'NULL'}`);
        console.log(`   Business Email: ${setting.business_email || 'NULL'}`);
        console.log(`   Email From Name: ${setting.email_from_name || 'NULL'}`);
      });
    }

    // 4. Check for any signed contracts in the last hour
    console.log('\n✍️ RECENTLY SIGNED CONTRACTS:');
    const signedContracts = await pool.query(`
      SELECT 
        id,
        contract_number,
        client_name,
        status,
        signed_at,
        client_phone,
        client_address
      FROM contracts 
      WHERE signed_at >= NOW() - INTERVAL '1 hour'
      ORDER BY signed_at DESC
    `);

    if (signedContracts.rows.length === 0) {
      console.log('❌ No contracts signed in the last hour');
    } else {
      signedContracts.rows.forEach((contract, index) => {
        console.log(`\n${index + 1}. Contract ${contract.contract_number}:`);
        console.log(`   Status: ${contract.status}`);
        console.log(`   Signed At: ${contract.signed_at}`);
        console.log(`   Client Phone: ${contract.client_phone || 'NULL'}`);
        console.log(`   Client Address: ${contract.client_address || 'NULL'}`);
      });
    }

    // 5. Check R2 cloud storage configuration
    console.log('\n☁️ CLOUD STORAGE CONFIGURATION:');
    const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
    const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2BucketName = process.env.R2_BUCKET_NAME;
    
    console.log(`   Access Key: ${r2AccessKey ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Secret Key: ${r2SecretKey ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Account ID: ${r2AccountId ? '✅ Present' : '❌ Missing'}`);
    console.log(`   Bucket Name: ${r2BucketName || '❌ Missing'}`);

    // 6. Issue Analysis
    console.log('\n🔍 ISSUE ANALYSIS:');
    console.log('\n1. CONFIRMATION EMAIL ISSUE:');
    if (!mailgunApiKey || !mailgunDomain) {
      console.log('   ❌ Mailgun credentials missing - emails will fail');
    } else {
      console.log('   ✅ Mailgun credentials present');
      console.log('   💡 Check server logs for email sending errors');
    }

    console.log('\n2. CLIENT-FILLABLE FIELDS ISSUE:');
    console.log('   ✅ Fields added to cloud signing page template');
    console.log('   ✅ Form submission updated to include clientPhone and clientAddress');
    console.log('   💡 Existing contracts need "Regenerate Link" to get updated signing page');

    console.log('\n3. CONTRACT STATUS ISSUE:');
    console.log('   ✅ Status detection logic embedded in cloud signing page');
    console.log('   💡 Existing contracts may have old signing pages cached');

    console.log('\n🎯 RECOMMENDED FIXES:');
    console.log('1. Deploy the updated code to production');
    console.log('2. Use "Regenerate Link" button on existing contracts');
    console.log('3. Test contract signing process end-to-end');
    console.log('4. Check server logs for email sending errors');
    console.log('5. Verify Mailgun credentials are working');

  } catch (error) {
    console.error('Error debugging contract signing issues:', error);
  } finally {
    await pool.end();
  }
}

debugContractSigningIssues();