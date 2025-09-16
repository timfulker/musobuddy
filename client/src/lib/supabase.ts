import { createClient } from '@supabase/supabase-js'

/**
 * Environment-aware Supabase client configuration
 * Automatically switches between dev/prod based on environment variables
 */

// Determine environment based on hostname and build flags
const isProductionDomain = window.location.hostname === 'www.musobuddy.com' || window.location.hostname === 'musobuddy.com'
const isDevelopmentDomain = window.location.hostname === 'localhost' ||
                           window.location.hostname.includes('replit.dev') ||
                           window.location.hostname.includes('repl.co') ||
                           window.location.hostname.includes('csb.app') ||
                           window.location.hostname.includes('vercel.app') ||
                           window.location.hostname.includes('netlify.app')

// Production domain takes priority over Vite build flags
const isProduction = isProductionDomain
const isDevelopment = !isProduction

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