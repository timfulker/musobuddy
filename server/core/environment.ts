// CENTRALIZED ENVIRONMENT DETECTION - Single Source of Truth
// This file provides consistent environment detection across the entire application

export interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  appServerUrl: string;
  sessionSecure: boolean;
  nodeEnv: string;
  replitDeployment: string | undefined;
  replitEnvironment: string | undefined;
  replitDevDomain: string | undefined;
}

/**
 * Authoritative environment detection
 * This is the ONLY function that should determine production vs development
 */
function detectEnvironment(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const replitDeployment = process.env.REPLIT_DEPLOYMENT;
  const replitEnvironment = process.env.REPLIT_ENVIRONMENT;
  const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;
  
  // Production indicators (in order of priority)
  // CRITICAL FIX: Only true production when actually deployed
  const isProduction = !!(
    replitDeployment ||                           // Replit deployment (most reliable)
    (nodeEnv === 'production' && replitDeployment) // Explicit production mode with deployment
  );
  
  // Determine app server URL
  let appServerUrl: string;
  if (process.env.APP_SERVER_URL) {
    // Explicit override (highest priority)
    appServerUrl = process.env.APP_SERVER_URL;
  } else if (replitDeployment || replitEnvironment === 'production') {
    // Production deployment
    appServerUrl = 'https://musobuddy.replit.app';
  } else if (replitDevDomain) {
    // Development on Replit
    appServerUrl = `https://${replitDevDomain}`;
  } else {
    // Local development
    appServerUrl = 'http://localhost:5000';
  }
  
  return {
    isProduction,
    isDevelopment: !isProduction,
    appServerUrl,
    sessionSecure: isProduction,
    nodeEnv,
    replitDeployment,
    replitEnvironment,
    replitDevDomain
  };
}

// Export the authoritative environment configuration
export const ENV = detectEnvironment();

// Log environment detection result once at startup
console.log('🔍 AUTHORITATIVE ENVIRONMENT DETECTION:', {
  isProduction: ENV.isProduction,
  isDevelopment: ENV.isDevelopment,
  appServerUrl: ENV.appServerUrl,
  sessionSecure: ENV.sessionSecure,
  nodeEnv: ENV.nodeEnv,
  replitDeployment: ENV.replitDeployment,
  replitEnvironment: ENV.replitEnvironment,
  replitDevDomain: ENV.replitDevDomain
});

// Convenience functions
export const isProduction = (): boolean => ENV.isProduction;
export const isDevelopment = (): boolean => ENV.isDevelopment;
export const getAppServerUrl = (): string => ENV.appServerUrl;
export const shouldUseSecureCookies = (): boolean => ENV.sessionSecure;