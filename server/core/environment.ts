/**
 * Replit-specific environment detection
 * Handles both development (janeway.replit.dev) and production (musobuddy.replit.app)
 */
interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  isReplitProduction: boolean;
  appServerUrl: string;
  sessionSecure: boolean;
  nodeEnv: string;
  replitDeployment?: string;
  replitEnvironment?: string;
  replitDevDomain?: string;
}

/**
 * Replit-specific environment detection
 * Handles both development (janeway.replit.dev) and production (musobuddy.replit.app)
 */
function detectEnvironment(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const replitDeployment = process.env.REPLIT_DEPLOYMENT;
  const replitEnvironment = process.env.REPLIT_ENVIRONMENT;
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
  
  // REPLIT PRODUCTION DETECTION: Multiple methods for Replit's deployment
  const isReplitProduction = !!(
    replitDeployment || // Replit sets this in true production deployments
    replitEnvironment === 'production' || // Alternative production indicator
    process.env.REPLIT_DB_URL || // Production usually has Replit DB
    (typeof process.env.REPL_SLUG !== 'undefined' && !replitDevDomain) // In Replit without dev domain = production
  );
  
  // CRITICAL: Override NODE_ENV based on Replit detection
  const isProduction = isReplitProduction || nodeEnv === 'production';
  
  // Determine app server URL with Replit-specific logic
  let appServerUrl: string;
  if (process.env.APP_SERVER_URL) {
    // Explicit override (highest priority)
    appServerUrl = process.env.APP_SERVER_URL;
  } else if (isReplitProduction) {
    // REPLIT PRODUCTION: Use the known production URL
    appServerUrl = 'https://musobuddy.replit.app';
  } else if (replitDevDomain) {
    // REPLIT DEVELOPMENT: Use the dev domain
    appServerUrl = `https://${replitDevDomain}`;
  } else {
    // Local development fallback
    appServerUrl = 'http://localhost:5000';
  }
  
  // CRITICAL FIX: Override session security for localhost testing
  const sessionSecure = isReplitProduction && !appServerUrl.includes('localhost');
  
  return {
    isProduction,
    isDevelopment: !isProduction,
    isReplitProduction,
    appServerUrl,
    sessionSecure,
    nodeEnv,
    replitDeployment,
    replitEnvironment,
    replitDevDomain
  };
}

// Export the authoritative environment configuration
export const ENV = detectEnvironment();

// Helper functions for backwards compatibility
export const isProduction = () => ENV.isProduction;
export const getAppServerUrl = () => ENV.appServerUrl;

export function validateSessionConfiguration() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for session storage');
  }
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️ SESSION_SECRET not set - using default (not recommended for production)');
  }
}

// Log Replit-specific environment detection
console.log('🔍 REPLIT ENVIRONMENT DETECTION:', {
  isProduction: ENV.isProduction,
  isReplitProduction: ENV.isReplitProduction,
  appServerUrl: ENV.appServerUrl,
  sessionSecure: ENV.sessionSecure,
  replitDeployment: ENV.replitDeployment,
  replitEnvironment: ENV.replitEnvironment,
  replitDevDomain: ENV.replitDevDomain,
  replDbUrl: process.env.REPLIT_DB_URL ? 'SET' : 'NOT_SET',
  replSlug: process.env.REPL_SLUG || 'NOT_SET'
});

// REPLIT PRODUCTION VALIDATION
if (ENV.isReplitProduction) {
  console.log('🚀 REPLIT PRODUCTION MODE DETECTED');
  console.log('📍 Production URL:', ENV.appServerUrl);
  console.log('🔒 Session Security:', ENV.sessionSecure ? 'ENABLED' : 'DISABLED');
  
  // Validate production requirements
  if (!process.env.DATABASE_URL) {
    console.error('❌ REPLIT PRODUCTION ERROR: DATABASE_URL not set');
  }
  if (!process.env.SESSION_SECRET) {
    console.warn('⚠️ REPLIT PRODUCTION WARNING: SESSION_SECRET not set - using default');
  }
} else {
  console.log('🛠️ REPLIT DEVELOPMENT MODE');
  console.log('📍 Development URL:', ENV.appServerUrl);
}