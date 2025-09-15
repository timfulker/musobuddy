import { createClient } from '@supabase/supabase-js'

/**
 * Environment-aware Supabase client configuration
 * Automatically switches between dev/prod based on environment variables
 */

// Determine environment - Vite uses import.meta.env.MODE
const isDevelopment = import.meta.env.MODE === 'development'
const isProduction = import.meta.env.MODE === 'production'

// Select appropriate credentials based on environment
const supabaseUrl = isDevelopment
  ? (import.meta.env.VITE_SUPABASE_URL_DEV || 'https://wkhrzcpvghdlhnxzhrde.supabase.co')
  : (import.meta.env.VITE_SUPABASE_URL_PRODUCTION || import.meta.env.VITE_SUPABASE_URL)

const supabaseAnonKey = isDevelopment
  ? (import.meta.env.VITE_SUPABASE_ANON_KEY_DEV || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndraHJ6Y3B2Z2hkbGhueHpocmRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjEzNjMsImV4cCI6MjA3MzMzNzM2M30.Li_pGOBIHGPHV-hrEG6Lf7SrHRj1D4tzJ_xM9KAMaBc')
  : (import.meta.env.VITE_SUPABASE_ANON_KEY_PRODUCTION || import.meta.env.VITE_SUPABASE_ANON_KEY)

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