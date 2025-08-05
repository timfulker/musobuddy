// Application constants - centralized configuration values

export const PAGINATION = {
  DEFAULT_BOOKING_LIMIT: 50,
  DEFAULT_CONTRACT_LIMIT: 50,
  DEFAULT_INVOICE_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1
} as const;

export const TIMEOUTS = {
  AI_REQUEST: 120000, // 2 minutes for AI requests
  EMAIL_SEND: 30000, // 30 seconds for email sending
  PDF_GENERATION: 60000, // 1 minute for PDF generation
  DATABASE_QUERY: 10000, // 10 seconds for database queries
  HTTP_REQUEST: 30000 // 30 seconds for external HTTP requests
} as const;

export const BATCH_SIZES = {
  EMAIL_PROCESSING: 25, // Process emails in batches of 25
  BULK_OPERATIONS: 50, // Bulk database operations
  AI_TEMPLATE_VARIATIONS: 5 // Maximum template variations to generate
} as const;

export const VALIDATION_LIMITS = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_PHONE_LENGTH: 20,
  MAX_ADDRESS_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_VENUE_LENGTH: 200,
  MIN_FEE: 0.01,
  MAX_FEE: 999999.99,
  MIN_DUE_DAYS: 1,
  MAX_DUE_DAYS: 365
} as const;

export const BUSINESS_RULES = {
  CONTRACT_EXPIRY_DAYS: 30, // Contracts expire after 30 days if not signed
  INVOICE_DEFAULT_DUE_DAYS: 30, // Default invoice payment terms
  BOOKING_ADVANCE_DAYS: 1, // Minimum days in advance for bookings
  MAX_CONCURRENT_BOOKINGS: 5, // Maximum overlapping bookings allowed
  DEFAULT_EVENT_DURATION_HOURS: 3 // Default event duration if not specified
} as const;

export const FILE_LIMITS = {
  MAX_UPLOAD_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain'],
  MAX_FILENAME_LENGTH: 255
} as const;

export const EMAIL_CONFIG = {
  MAX_RECIPIENTS: 10, // Maximum recipients per email
  MAX_SUBJECT_LENGTH: 255,
  MAX_BODY_LENGTH: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second base delay
} as const;

export const AI_CONFIG = {
  MAX_INPUT_LENGTH: 5000, // Maximum characters for AI input
  MAX_OUTPUT_LENGTH: 2000, // Maximum expected AI output length
  DEFAULT_TEMPERATURE: 0.7, // AI creativity level
  MAX_TOKENS: 1000, // Maximum tokens for AI response
  SUPPORTED_TEMPLATE_TYPES: ['quote', 'contract', 'email'] as const
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const CACHE_KEYS = {
  USER_SETTINGS: (userId: number) => `user_settings:${userId}`,
  CONTRACT_TEMPLATE: (userId: number) => `contract_template:${userId}`,
  INVOICE_TEMPLATE: (userId: number) => `invoice_template:${userId}`,
  BOOKING_CONFLICTS: (userId: number, date: string) => `booking_conflicts:${userId}:${date}`
} as const;

export const REGEX_PATTERNS = {
  DATE: /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD format
  TIME: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM format
  PHONE: /^[\+]?[1-9][\d]{0,15}$/, // International phone format
  POSTCODE_UK: /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i, // UK postcode
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
} as const;

export const FEATURE_FLAGS = {
  ENABLE_AI_TEMPLATES: true,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_ANALYTICS: false,
  ENABLE_WEBHOOKS: false,
  STRICT_VALIDATION: true
} as const;

// Environment-specific constants
export const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    IS_DEVELOPMENT: isDevelopment,
    IS_PRODUCTION: isProduction,
    LOG_LEVEL: isDevelopment ? 'debug' : 'info',
    ENABLE_CORS: true,
    ENABLE_RATE_LIMITING: !isDevelopment, // Disable in dev for easier testing
    SESSION_SECURE: isProduction,
    COOKIE_SAME_SITE: isProduction ? 'strict' : 'lax'
  } as const;
};