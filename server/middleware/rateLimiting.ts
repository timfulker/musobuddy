import rateLimit from 'express-rate-limit';

// Standard message for rate limit exceeded
const rateLimitMessage = {
  error: 'Too many requests',
  status: 'error',
  message: 'You have exceeded the rate limit. Please try again later.',
  timestamp: new Date().toISOString()
};

// Very strict rate limiting for sensitive operations
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development for testing
    return process.env.NODE_ENV === 'development';
  }
});

// Authentication rate limiting
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 10, // 10 login attempts per 15 minutes
  message: {
    ...rateLimitMessage,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Contract signing rate limiting
export const contractSigningRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 signing attempts per 5 minutes
  message: {
    ...rateLimitMessage,
    message: 'Too many contract signing attempts. Please wait 5 minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// SMS verification rate limiting
export const smsRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 SMS per hour
  message: {
    ...rateLimitMessage,
    message: 'Too many SMS requests. Please wait an hour before requesting another verification code.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// Email sending rate limiting
export const emailRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 emails per 10 minutes
  message: {
    ...rateLimitMessage,
    message: 'Too many email requests. Please wait before sending more emails.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// AI generation rate limiting (more expensive operations)
export const aiRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 AI requests per hour
  message: {
    ...rateLimitMessage,
    message: 'AI generation rate limit exceeded. Please wait an hour before making more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// File upload rate limiting
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: {
    ...rateLimitMessage,
    message: 'Too many file uploads. Please wait before uploading more files.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});

// General API rate limiting (more permissive)
export const generalApiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: rateLimitMessage,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for health checks and static assets
    return req.path.startsWith('/api/health') || 
           req.path.startsWith('/static') ||
           process.env.NODE_ENV === 'development';
  }
});