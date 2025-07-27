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

// CRITICAL SAFEGUARD: Validate environment detection
if (ENV.isProduction && !ENV.replitDeployment) {
  console.error('🚨 ENVIRONMENT DETECTION ERROR: Production detected without REPLIT_DEPLOYMENT!');
  console.error('🚨 This indicates a configuration bug that will break session authentication');
  console.error('🚨 Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
    REPLIT_ENVIRONMENT: process.env.REPLIT_ENVIRONMENT
  });
  throw new Error('Invalid production environment detection - missing REPLIT_DEPLOYMENT');
}

// Session security validation
if (ENV.sessionSecure && ENV.appServerUrl.startsWith('http:')) {
  console.error('🚨 SESSION SECURITY ERROR: Secure cookies required for HTTP URL!');
  console.error('🚨 This will break session authentication in development');
  throw new Error('Session security misconfiguration - secure cookies on HTTP');
}

// Convenience functions
export const isProduction = (): boolean => ENV.isProduction;
export const isDevelopment = (): boolean => ENV.isDevelopment;
export const getAppServerUrl = (): string => ENV.appServerUrl;
export const shouldUseSecureCookies = (): boolean => ENV.sessionSecure;

/**
 * SAFEGUARD: Validate session configuration for current environment
 * Call this before starting the server to catch configuration errors early
 */
export function validateSessionConfiguration(): void {
  if (ENV.isProduction) {
    if (!ENV.sessionSecure) {
      throw new Error('Production environment must use secure session cookies');
    }
    if (!ENV.appServerUrl.startsWith('https:')) {
      throw new Error('Production environment must use HTTPS URLs');
    }
    if (!ENV.replitDeployment) {
      throw new Error('Production environment requires REPLIT_DEPLOYMENT');
    }
  } else {
    if (ENV.sessionSecure && ENV.appServerUrl.startsWith('http:')) {
      throw new Error('Development environment cannot use secure cookies with HTTP');
    }
  }
  
  console.log('✅ Session configuration validated for', ENV.isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
}