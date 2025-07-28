import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

/**
 * Rate limiting configuration for MusoBuddy authentication endpoints
 * Protects against brute force attacks and SMS abuse
 */

// Login protection - prevents brute force attacks
export const loginRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 attempts per minute per IP
  message: {
    error: 'Too many login attempts. Please wait a minute before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin in development
    return process.env.NODE_ENV === 'development' && req.body?.email === 'timfulker@gmail.com';
  }
});

// Phone verification protection - prevents SMS abuse
export const phoneVerificationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 verification codes per hour per IP
  message: {
    error: 'Too many verification attempts. Please wait an hour before requesting another code.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Signup protection - prevents spam registrations
export const signupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 signups per hour per IP
  message: {
    error: 'Too many signup attempts. Please wait an hour before creating another account.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API protection - prevents API abuse
export const generalApiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    error: 'Too many requests. Please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for static assets and health checks
    return req.path.startsWith('/assets/') || 
           req.path === '/health' ||
           req.path === '/api/health';
  }
});

// Slow down repeated requests (adds delay instead of blocking)
export const slowDownMiddleware = slowDown({
  windowMs: 60 * 1000, // 1 minute
  delayAfter: 50, // Allow 50 requests per minute at full speed
  delayMs: () => 100, // Add 100ms delay per request after limit (fixed for v2)
  maxDelayMs: 2000, // Maximum delay of 2 seconds
  validate: { delayMs: false }, // Disable warning about delayMs
  skip: (req) => {
    // Skip for static assets and health checks
    return req.path.startsWith('/assets/') || 
           req.path === '/health' ||
           req.path === '/api/health';
  }
});

// Password reset protection - prevents abuse of password reset
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset attempts per hour per IP
  message: {
    error: 'Too many password reset attempts. Please wait an hour before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

console.log('🛡️ Rate limiting configured - Login: 5/min, SMS: 3/hour, Signup: 10/hour, API: 100/min');