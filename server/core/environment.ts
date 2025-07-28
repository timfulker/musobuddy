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
  DATABASE_URL: string;
  SESSION_SECRET: string;
}

/**
 * Replit-specific environment detection
 * Handles both development (janeway.replit.dev) and production (musobuddy.replit.app)
 */
function detectEnvironment(): EnvironmentConfig {
  // Replit production detection based on REPLIT_ENVIRONMENT
  const isReplitProduction = process.env.REPLIT_ENVIRONMENT === 'production';
  
  // Production mode when REPLIT_ENVIRONMENT is production
  const isProduction = isReplitProduction;
  
  const appServerUrl = isReplitProduction 
    ? 'https://musobuddy.replit.app'
    : `https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:5000'}`;
  
  const sessionSecure = isProduction;
  
  return {
    isProduction,
    isDevelopment: !isProduction,
    isReplitProduction,
    appServerUrl,
    sessionSecure,
    nodeEnv: process.env.NODE_ENV || 'development',
    replitDeployment: process.env.REPLIT_DEPLOYMENT,
    replitEnvironment: process.env.REPLIT_ENVIRONMENT,
    replitDevDomain: process.env.REPLIT_DEV_DOMAIN,
    DATABASE_URL: process.env.DATABASE_URL!,
    SESSION_SECRET: process.env.SESSION_SECRET || 'musobuddy-session-secret-2025-default'
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