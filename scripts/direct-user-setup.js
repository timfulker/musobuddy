#!/usr/bin/env node

/**
 * Direct User Setup Script
 * Uses PostgreSQL connection to insert users directly
 */

import pkg from 'pg'
import dotenv from 'dotenv'

const { Client } = pkg
dotenv.config()

// The auth users we already created
const authUsers = {
  'timfulkermusic@gmail.com': 'def19542-0bdc-44e6-88d0-0e101ac1368a',
  'timfulker@gmail.com': '165747b2-dcdc-4266-8679-112ebbaf8f0c'
}

async function setupUsersDirectly() {
  console.log('🚀 Setting up production users via direct PostgreSQL connection...\n')

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL_PROD
  })

  try {
    await client.connect()
    console.log('✅ Connected to production database')

    for (const [email, supabaseUid] of Object.entries(authUsers)) {
      console.log(`\n👤 Setting up ${email}`)
      console.log(`   🆔 Supabase UID: ${supabaseUid}`)

      // Generate a unique user_id
      const userId = Math.floor(Math.random() * 1000000000)

      // 1. Insert into users table
      console.log('   📝 Creating custom user record...')
      await client.query(`
        INSERT INTO users (user_id, email, first_name, last_name, supabase_uid)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO UPDATE SET
          supabase_uid = EXCLUDED.supabase_uid,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name
      `, [userId, email, 'Tim', 'Fulker', supabaseUid])

      console.log(`   ✅ Custom user record created/updated with ID: ${userId}`)

      // 2. Insert into user_settings table
      console.log('   📝 Creating user settings...')
      await client.query(`
        INSERT INTO user_settings (user_id, theme, email_notifications, sms_notifications, calendar_sync)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id) DO UPDATE SET
          theme = EXCLUDED.theme,
          email_notifications = EXCLUDED.email_notifications,
          sms_notifications = EXCLUDED.sms_notifications,
          calendar_sync = EXCLUDED.calendar_sync
      `, [userId, 'light', true, false, false])

      console.log('   ✅ User settings created/updated')
      console.log(`   🎉 Successfully set up ${email}`)
    }

    console.log('\n✅ All users set up successfully!')
    console.log('\n🔑 Login Credentials:')
    console.log('• timfulkermusic@gmail.com / TempPass123!')
    console.log('• timfulker@gmail.com / TempPass123!')
    console.log('\n📋 Next Steps:')
    console.log('1. Test authentication on production')
    console.log('2. Users should reset their passwords immediately')

  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    throw error
  } finally {
    await client.end()
  }
}

setupUsersDirectly().catch(console.error)