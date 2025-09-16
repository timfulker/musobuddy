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
  // TEMPORARY: Force development mode
  const isProduction = false;
  
  // Production: Handle both string 'true' and numeric '1' values from Replit
  // const isProduction = Boolean(process.env.REPLIT_DEPLOYMENT) || 
  //                     process.env.REPLIT_DEPLOYMENT === 'true' || 
  //                     process.env.REPLIT_DEPLOYMENT === '1' ||
  //                     process.env.REPLIT_ENVIRONMENT === 'production';
  
  // Development: Everything else
  const isDevelopment = !isProduction;
  
  // Replit environment (both dev and prod)
  const isReplit = !!(process.env.REPLIT_DEPLOYMENT || process.env.REPLIT_DEV_DOMAIN);
  
  // URL detection - simple and clear
  let appServerUrl: string;
  let corsOrigin: string;
  
  if (isProduction) {
    // Production deployment - support both domains
    // Check if custom domain is being used via headers (set by proxy/CDN)
    const customDomain = process.env.CUSTOM_DOMAIN || 'www.musobuddy.com';
    const replitDomain = 'musobuddy.replit.app';
    
    // Default to custom domain, but this will be overridden by actual request host
    appServerUrl = `https://${customDomain}`;
    corsOrigin = [`https://${customDomain}`, `https://${replitDomain}`];
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