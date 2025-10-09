import { createClient } from '@supabase/supabase-js'

/**
 * Environment-aware Supabase client configuration
 * Automatically switches between dev/prod based on environment variables
 */

// Match backend environment - auto-detect from NODE_ENV
const isProduction = import.meta.env.PROD
const isDevelopment = import.meta.env.DEV

// Log environment alignment
console.log(`🔧 SUPABASE CONFIG: Using ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} environment`)
console.log('🔧 Current hostname:', window.location.hostname)

// Select appropriate credentials based on environment
const supabaseUrl = isDevelopment
  ? import.meta.env.VITE_SUPABASE_URL_DEV
  : import.meta.env.VITE_SUPABASE_URL_PRODUCTION

const supabaseAnonKey = isDevelopment
  ? import.meta.env.VITE_SUPABASE_ANON_KEY_DEV
  : import.meta.env.VITE_SUPABASE_ANON_KEY_PRODUCTION

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const env = isDevelopment ? 'development' : 'production'
  const envSuffix = isDevelopment ? 'DEV' : 'PRODUCTION'
  throw new Error(
    `Missing Supabase ${env} credentials. ` +
    `Please set VITE_SUPABASE_URL_${envSuffix} and VITE_SUPABASE_ANON_KEY_${envSuffix}`
  )
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage // Persist authentication across browser sessions
  }
})

// Log environment info (without exposing sensitive keys)
console.log(`🚀 Supabase Frontend Client initialized for ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`)
console.log('📊 Project:', supabaseUrl.split('.')[0].split('//')[1])
console.log('🔐 Using environment-specific credentials')