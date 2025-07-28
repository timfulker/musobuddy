// COMPLETELY REBUILT ENVIRONMENT DETECTION - Single Source of Truth
// This replaces all previous environment detection across the entire application

interface EnvironmentConfig {
  isProduction: boolean;
  isReplitDevelopment: boolean;
  appServerUrl: string;
  sessionSecure: boolean;
  sessionDomain?: string;
  corsOrigin: string;
}

/**
 * AUTHORITATIVE ENVIRONMENT DETECTION
 * This is the ONLY function that should determine environment across the entire app
 */
function detectEnvironment(): EnvironmentConfig {
  // Simple, clear production detection
  const isProduction = process.env.REPLIT_DEPLOYMENT === 'true';
  const isReplitDevelopment = !isProduction && !!process.env.REPLIT_DEV_DOMAIN;
  
  let appServerUrl: string;
  let corsOrigin: string;
  
  if (isProduction) {
    appServerUrl = 'https://musobuddy.replit.app';
    corsOrigin = 'https://musobuddy.replit.app';
  } else if (isReplitDevelopment) {
    appServerUrl = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    corsOrigin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  } else {
    appServerUrl = 'http://localhost:5000';
    corsOrigin = 'http://localhost:5000';
  }
  
  return {
    isProduction,
    isReplitDevelopment,
    appServerUrl,
    sessionSecure: isProduction, // Only secure in true production
    sessionDomain: undefined, // Let browser handle domain
    corsOrigin
  };
}

// Export single source of truth
export const ENV = detectEnvironment();

// Simple logging on import
console.log('🌍 REBUILT ENVIRONMENT CONFIG:', {
  isProduction: ENV.isProduction,
  isReplitDevelopment: ENV.isReplitDevelopment,
  appServerUrl: ENV.appServerUrl,
  sessionSecure: ENV.sessionSecure,
  replitDeployment: process.env.REPLIT_DEPLOYMENT,
  replitDevDomain: process.env.REPLIT_DEV_DOMAIN
});