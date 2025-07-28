// SINGLE SOURCE OF TRUTH - ENVIRONMENT DETECTION
// This file replaces ALL environment detection across the entire application

interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  isReplit: boolean;
  appServerUrl: string;
  sessionSecure: boolean;
  sessionDomain?: string;
  corsOrigin: string;
}

/**
 * AUTHORITATIVE ENVIRONMENT DETECTION
 * Clear, simple production detection based on REPLIT_DEPLOYMENT only
 */
function createEnvironmentConfig(): EnvironmentConfig {
  // Production: Handle both string 'true' and numeric '1' values from Replit
  const isProduction = Boolean(process.env.REPLIT_DEPLOYMENT) || 
                      process.env.REPLIT_DEPLOYMENT === 'true' || 
                      process.env.REPLIT_DEPLOYMENT === '1';
  
  // Development: Everything else
  const isDevelopment = !isProduction;
  
  // Replit environment (both dev and prod)
  const isReplit = !!(process.env.REPLIT_DEPLOYMENT || process.env.REPLIT_DEV_DOMAIN);
  
  // URL detection - simple and clear
  let appServerUrl: string;
  let corsOrigin: string;
  
  if (isProduction) {
    // Production deployment
    appServerUrl = 'https://musobuddy.replit.app';
    corsOrigin = 'https://musobuddy.replit.app';
  } else if (process.env.REPLIT_DEV_DOMAIN) {
    // Replit development
    appServerUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    corsOrigin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  } else {
    // Local development
    appServerUrl = 'http://localhost:5000';
    corsOrigin = 'http://localhost:5000';
  }
  
  return {
    isProduction,
    isDevelopment,
    isReplit,
    appServerUrl,
    sessionSecure: isProduction, // Only secure cookies in true production
    sessionDomain: undefined, // Let browser handle domain automatically
    corsOrigin
  };
}

// Export single instance - imported everywhere
export const ENV = createEnvironmentConfig();

// Log once on startup
console.log('🌍 ENVIRONMENT CONFIG:', {
  isProduction: ENV.isProduction,
  isDevelopment: ENV.isDevelopment,
  isReplit: ENV.isReplit,
  appServerUrl: ENV.appServerUrl,
  sessionSecure: ENV.sessionSecure
});