import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; // We'll generate this from Supabase

/**
 * Environment-aware Supabase client configuration
 * Automatically switches between dev/prod based on NODE_ENV
 */

// Use centralized environment detection - no overrides based on DATABASE_URL
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// Frontend environment variables (VITE_ prefix required for browser access)
const SUPABASE_URL = isDevelopment
  ? import.meta.env.VITE_SUPABASE_URL_DEV
  : import.meta.env.VITE_SUPABASE_URL_PRODUCTION;

const SUPABASE_ANON_KEY = isDevelopment
  ? import.meta.env.VITE_SUPABASE_ANON_KEY_DEV
  : import.meta.env.VITE_SUPABASE_ANON_KEY_PRODUCTION;

const SUPABASE_SERVICE_KEY = isDevelopment
  ? process.env.SUPABASE_SERVICE_KEY_DEV
  : process.env.SUPABASE_SERVICE_KEY_PROD;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const env = isDevelopment ? 'development' : 'production';
  throw new Error(
    `Missing Supabase ${env} credentials. ` +
    `Please set SUPABASE_URL_${env.toUpperCase()} and SUPABASE_ANON_KEY_${env.toUpperCase()}`
  );
}

// Log which environment we're using (but never log keys!)
const envLabel = isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION';
console.log(`🚀 Supabase Client initialized for ${envLabel}`);
console.log(`📊 Project: ${SUPABASE_URL.split('.')[0].split('//')[1]}`);
console.log(`🔐 Using environment-specific credentials`);

/**
 * Public Supabase client (for client-side operations)
 * Uses anon key with RLS enabled
 */
export const supabase: SupabaseClient<Database> = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'musobuddy',
      },
    },
  }
);

/**
 * Admin Supabase client (for server-side admin operations)
 * Uses service key - NEVER expose to client!
 * Only use in server-side code
 */
export const supabaseAdmin: SupabaseClient<Database> | null = 
  SUPABASE_SERVICE_KEY 
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;


/**
 * Health check for Supabase connection
 */
export async function checkSupabaseConnection(): Promise<{
  connected: boolean;
  environment: string;
  project: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('_health_check')
      .select('*')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // Table doesn't exist is ok
      throw error;
    }

    return {
      connected: true,
      environment: isDevelopment ? 'development' : 'production',
      project: SUPABASE_URL.split('.')[0].split('//')[1],
    };
  } catch (error) {
    return {
      connected: false,
      environment: isDevelopment ? 'development' : 'production',
      project: SUPABASE_URL?.split('.')[0].split('//')[1] || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Type exports for use throughout the app
export type { Database };
export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];