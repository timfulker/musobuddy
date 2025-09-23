import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { insertContractSchema, insertBookingSchema, insertInvoiceSchema } from '@shared/schema';

// Validation middleware factory
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }
      
      // Replace req.body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Query parameter validation
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({
          error: 'Query validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        });
      }
      
      req.query = result.data;
      next();
    } catch (error) {
      console.error('Query validation middleware error:', error);
      res.status(500).json({
        error: 'Internal validation error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

// Common validation schemas - CRITICAL FIX: Using shared schemas to prevent drift
export const schemas = {
  // Contract creation - FIXED: Accept both string and number for fee/deposit
  createContract: insertContractSchema.extend({
    // Additional validations on top of shared schema
    clientName: z.string().trim().min(2, 'Client name must be at least 2 characters').max(100, 'Client name too long'),
    eventDate: z.coerce.date(), // Ensure date coercion
    // CRITICAL FIX: Accept both string and number, always output as string for database
    fee: z.union([z.string(), z.number()]).transform((val) => {
      if (val === null || val === undefined || val === '') return "0";
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? "0" : num.toString();
    }),
    deposit: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    travelExpense: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    // CRITICAL FIX: venue is now optional (inherited from shared schema) - NO MORE 400 ERRORS
    // venue validation removed - follows shared schema (optional)
  }),

  // Contract signing
  signContract: z.object({
    clientSignature: z.string().trim().min(2, 'Signature must be at least 2 characters').max(100, 'Signature too long'),
    clientIP: z.string().optional(),
    clientPhone: z.string().optional(),
    clientAddress: z.string().optional(),
    venueAddress: z.string().optional()
  }),

  // Booking creation - CRITICAL FIX: Use shared schema with enhanced deposit normalization
  createBooking: insertBookingSchema.omit({ 
    userId: true // Server adds this from authenticated user, not from request body
  }).extend({
    // Additional validations on top of shared schema
    clientEmail: z.string().email('Invalid email format').optional().nullable(),
    eventDate: z.coerce.date().optional().nullable(), // Ensure date coercion
    venue: z.string().optional().nullable().transform((val) => {
      // Convert empty strings to null for consistency
      return val === '' ? null : val;
    }),
    // CRITICAL FIX: Add missing fee validation (same pattern as createContract)
    fee: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    // CRITICAL FIX: Add missing finalAmount validation  
    finalAmount: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    // CRITICAL FIX: Add missing travelExpense validation (same pattern as createContract)
    travelExpense: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    // CRITICAL FIX: Accept both deposit/depositAmount for backwards compatibility
    deposit: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    }),
  }).transform((data) => {
    // CRITICAL FIX: Enhanced deposit normalization to prevent ANY data loss
    // Priority: depositAmount > deposit > null (guarantees no data loss)
    let finalDepositAmount = null;
    if (data.depositAmount !== null && data.depositAmount !== undefined) {
      finalDepositAmount = data.depositAmount;
    } else if (data.deposit !== null && data.deposit !== undefined) {
      finalDepositAmount = data.deposit;
    }
    
    // Remove the temporary deposit field and ensure depositAmount is properly set
    const { deposit, ...rest } = data;
    return {
      ...rest,
      depositAmount: finalDepositAmount
    };
  }).refine((data) => {
    // At least some basic info should be provided
    return data.clientName || data.clientEmail || data.clientPhone || data.venue || data.eventDate;
  }, {
    message: "At least one field (client name, email, phone, venue, or date) must be provided"
  }),

  // Invoice creation - CRITICAL FIX: Use shared schema
  createInvoice: insertInvoiceSchema.extend({
    // Additional validations on top of shared schema
    clientName: z.string().trim().min(1, 'Client name is required'),
    clientEmail: z.string().email('Invalid email format').optional(),
    ccEmail: z.string().email('Invalid email format').optional(),
    eventDate: z.coerce.date().optional().nullable(), // Ensure date coercion
    dueDate: z.coerce.date(), // Ensure date coercion
    amount: z.union([z.string(), z.number()]).transform((val) => {
      if (val === null || val === undefined || val === '') return 0;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    }),
    depositPaid: z.union([z.string(), z.number()]).optional().transform((val) => {
      if (val === null || val === undefined || val === '') return 0;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? 0 : num;
    }),
    // Support frontend field mapping
    performanceDate: z.coerce.date().optional().nullable(), // Frontend field name
    customItems: z.array(z.object({
      description: z.string().trim().min(1, 'Item description required').max(200, 'Description too long'),
      amount: z.number().positive('Amount must be positive')
    })).optional()
  }).transform((data) => {
    // Map performanceDate to eventDate if provided
    if (data.performanceDate && !data.eventDate) {
      data.eventDate = data.performanceDate;
    }
    // Remove performanceDate after mapping
    const { performanceDate, ...rest } = data;
    return rest;
  }),

  // User settings update - COMPREHENSIVE SCHEMA TO PREVENT DATA LOSS
  updateSettings: z.object({
    // Business Details
    businessName: z.string().trim().min(1, 'Business name required').max(100, 'Business name too long').optional(),
    businessContactEmail: z.string().email('Invalid email format').optional(),
    addressLine1: z.string().max(200, 'Address line too long').optional(),
    addressLine2: z.string().max(200, 'Address line too long').optional(),
    city: z.string().max(100, 'City name too long').optional(),
    county: z.string().max(100, 'County name too long').optional(),
    postcode: z.string().max(20, 'Postcode too long').optional(),
    phone: z.string().max(50, 'Phone number too long').optional(),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
    taxNumber: z.string().max(50, 'Tax number too long').optional(),
    emailFromName: z.string().max(100, 'From name too long').optional(),
    
    // Financial Settings
    nextInvoiceNumber: z.number().int().min(1, 'Invoice number must be at least 1').optional(),
    bankDetails: z.string().max(1000, 'Bank details too long').optional(),
    
    // AI Pricing
    aiPricingEnabled: z.boolean().optional(),
    baseHourlyRate: z.number().min(0, 'Rate cannot be negative').optional(),
    minimumBookingHours: z.number().min(0, 'Hours cannot be negative').optional(),
    additionalHourRate: z.number().min(0, 'Rate cannot be negative').optional(),
    djServiceRate: z.number().min(0, 'Rate cannot be negative').optional(),
    pricingNotes: z.string().max(1000, 'Notes too long').optional(),
    specialOffers: z.string().max(1000, 'Offers text too long').optional(),
    
    // Instruments and Performance
    primaryInstrument: z.string().max(100, 'Instrument name too long').optional(),
    secondaryInstruments: z.array(z.string().max(100, 'Instrument name too long')).optional(),
    customGigTypes: z.array(z.string().max(100, 'Gig type name too long')).optional(),
    bookingDisplayLimit: z.enum(['50', 'all']).optional(),
    
    // Theme Settings
    themeAccentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    themeShowTerms: z.boolean().optional(),
  }),

  // AI template generation
  generateTemplate: z.object({
    enquiryText: z.string().trim().min(10, 'Enquiry text too short').max(5000, 'Enquiry text too long'),
    templateType: z.enum(['quote', 'contract', 'email'], { invalid_type_error: 'Invalid template type' })
  }),

  // Pagination
  pagination: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).refine(n => n > 0, 'Page must be positive').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be 1-100').optional()
  }),

  // Booking update - CRITICAL FIX: Make all fields optional for partial updates
  updateBooking: z.object({
    clientName: z.string().optional(),
    clientEmail: z.string().email('Invalid email format').optional().nullable(),
    clientPhone: z.string().optional().nullable(),
    eventDate: z.coerce.date().optional().nullable(),
    eventTime: z.string().optional().nullable(),
    eventEndTime: z.string().optional().nullable(),
    venue: z.string().optional().nullable(),
    performanceDuration: z.string().optional().nullable(),
    fee: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    finalAmount: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    travelExpense: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    deposit: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    depositAmount: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num.toString();
    }),
    notes: z.string().optional().nullable(),
    status: z.string().optional(),
    invoiceSent: z.boolean().optional(),
    contractSent: z.boolean().optional(),
    confirmationSent: z.boolean().optional(),
    reminderSent: z.boolean().optional(),
    followUpSent: z.boolean().optional(),
    invoiceNumber: z.string().optional().nullable(),
    contractNumber: z.string().optional().nullable()
  }).refine((data) => {
    // At least one field must be provided for update
    return Object.values(data).some(value => value !== undefined);
  }, 'At least one field must be provided for update')
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // SECURITY FIX: Enhanced XSS protection - simplified for server-side compatibility
      try {
        // Basic HTML tag and script removal - server-safe implementation
        return value
          .replace(/<script[^>]*>.*?<\/script>/gis, '')
          .replace(/<[^>]*>/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
          .trim();
      } catch (error) {
        // Fallback to basic sanitization if DOMPurify fails
        console.warn('Input sanitization fallback used');
        return value.replace(/<[^>]*>/g, '').trim();
      }
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeValue);
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }

  next();
};