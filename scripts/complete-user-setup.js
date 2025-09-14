#!/usr/bin/env node

/**
 * Complete User Setup Script
 * Finishes setting up users in custom tables (after auth users already exist)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseProduction = createClient(
  process.env.SUPABASE_URL_PROD,
  process.env.SUPABASE_SERVICE_KEY_PROD
)

// The auth users we already created
const authUsers = {
  'timfulkermusic@gmail.com': 'def19542-0bdc-44e6-88d0-0e101ac1368a',
  'timfulker@gmail.com': '165747b2-dcdc-4266-8679-112ebbaf8f0c'
}

async function completeUserSetup() {
  console.log('🚀 Completing production user setup...\n')

  for (const [email, supabaseUid] of Object.entries(authUsers)) {
    console.log(`👤 Setting up ${email}`)
    console.log(`   🆔 Supabase UID: ${supabaseUid}`)

    try {
      // Generate a unique user_id for the custom table
      const userId = Math.floor(Math.random() * 1000000000)

      // 1. Create custom user record
      console.log('   📝 Creating custom user record...')
      const { data: customUser, error: customError } = await supabaseProduction
        .from('users')
        .upsert({
          user_id: userId,
          email: email,
          first_name: 'Tim',
          last_name: 'Fulker',
          supabase_uid: supabaseUid
        })
        .select()
        .single()

      if (customError) throw customError
      console.log(`   ✅ Custom user record created with ID: ${userId}`)

      // 2. Create default user settings
      console.log('   📝 Creating user settings...')
      const { error: settingsError } = await supabaseProduction
        .from('user_settings')
        .upsert({
          user_id: userId,
          theme: 'light',
          email_notifications: true,
          sms_notifications: false,
          calendar_sync: false
        })

      if (settingsError) throw settingsError
      console.log(`   ✅ User settings created`)

      console.log(`   🎉 Successfully completed setup for ${email}\n`)

    } catch (error) {
      console.error(`   ❌ Failed to complete setup for ${email}:`, error.message)
      console.error('   📋 Error details:', error)
    }
  }

  console.log('✅ User setup completion finished!')
  console.log('\n📋 Next Steps:')
  console.log('1. Test authentication with: timfulkermusic@gmail.com / TempPass123!')
  console.log('2. Test authentication with: timfulker@gmail.com / TempPass123!')
  console.log('3. Users should reset their passwords immediately')
}

completeUserSetup().catch(console.error)