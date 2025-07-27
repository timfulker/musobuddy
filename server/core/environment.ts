// CENTRALIZED ENVIRONMENT DETECTION - Single Source of Truth
// This file provides consistent environment detection across the entire application

export interface EnvironmentConfig {
  isProduction: boolean;
  isDevelopment: boolean;
  isReplitProduction: boolean; // NEW: Specific Replit production flag
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
  
  // REPLIT PRODUCTION DETECTION: Multiple methods for Replit's deployment
  const isReplitProduction = !!(
    replitDeployment || // Replit sets this in true production deployments
    replitEnvironment === 'production' || // Alternative production indicator
    process.env.REPLIT_DB_URL || // Production usually has Replit DB
    (typeof process.env.REPL_SLUG !== 'undefined' && !replitDevDomain) // In Replit without dev domain = production
  );
  
  // CRITICAL: Override NODE_ENV based on Replit detection
  const isProduction = isReplitProduction || nodeEnv === 'production';
  
  // Determine app server URL
  let appServerUrl: string;
  if (process.env.APP_SERVER_URL) {
    // Explicit override (highest priority)
    appServerUrl = process.env.APP_SERVER_URL;
  } else if (isReplitProduction) {
    // REPLIT PRODUCTION: Use the known production URL
    appServerUrl = 'https://musobuddy.replit.app';
  } else if (replitDevDomain) {
    // Development on Replit (like current janeway domain)
    appServerUrl = `https://${replitDevDomain}`;
  } else {
    // Local development
    appServerUrl = 'http://localhost:5000';
  }
  
  return {
    isProduction,
    isDevelopment: !isProduction,
    isReplitProduction, // NEW: Specific Replit production flag
    appServerUrl,
    sessionSecure: isReplitProduction, // Secure cookies only in Replit production
    nodeEnv,
    replitDeployment,
    replitEnvironment,
    replitDevDomain
  };
}

// Export the authoritative environment configuration
export const ENV = detectEnvironment();

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

// GRACEFUL SAFEGUARD: Log environment detection warnings
if (ENV.isProduction && !ENV.replitDeployment) {
  console.warn('⚠️ ENVIRONMENT WARNING: Production detected without REPLIT_DEPLOYMENT');
  console.warn('⚠️ This may indicate environment misconfiguration');
  console.warn('⚠️ Environment variables:', {
    NODE_ENV: process.env.NODE_ENV,
    REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
    REPLIT_ENVIRONMENT: process.env.REPLIT_ENVIRONMENT
  });
  console.warn('⚠️ Continuing with detected configuration...');
}

// Session security warning (not fatal)
if (ENV.sessionSecure && ENV.appServerUrl.startsWith('http:')) {
  console.warn('⚠️ SESSION WARNING: Secure cookies on HTTP may cause issues');
  console.warn('⚠️ This configuration may break session authentication');
  console.warn('⚠️ Continuing with current configuration...');
}

// Convenience functions
export const isProduction = (): boolean => ENV.isProduction;
export const isDevelopment = (): boolean => ENV.isDevelopment;
export const getAppServerUrl = (): string => ENV.appServerUrl;
export const shouldUseSecureCookies = (): boolean => false; // ALWAYS false for Replit

/**
 * GRACEFUL VALIDATION: Check session configuration and log warnings
 * Does not crash the server - logs warnings for monitoring
 */
export function validateSessionConfiguration(): void {
  const warnings: string[] = [];
  
  if (ENV.isProduction) {
    if (!ENV.sessionSecure) {
      warnings.push('Production should use secure session cookies');
    }
    if (!ENV.appServerUrl.startsWith('https:')) {
      warnings.push('Production should use HTTPS URLs');
    }
    if (!ENV.replitDeployment) {
      warnings.push('Production should have REPLIT_DEPLOYMENT set');
    }
  } else {
    if (ENV.sessionSecure && ENV.appServerUrl.startsWith('http:')) {
      warnings.push('Development using secure cookies with HTTP may cause issues');
    }
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Session configuration warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('⚠️ Server continuing with current configuration');
  } else {
    console.log('✅ Session configuration validated for', ENV.isProduction ? 'PRODUCTION' : 'DEVELOPMENT');
  }
}