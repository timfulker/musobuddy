import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

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

// Common validation schemas
export const schemas = {
  // Contract creation
  createContract: z.object({
    clientName: z.string().trim().min(2, 'Client name must be at least 2 characters').max(100, 'Client name too long'),
    clientEmail: z.string().email('Invalid email format').optional(),
    clientPhone: z.string().optional(),
    eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    eventTime: z.string().optional(),
    fee: z.number().positive('Fee must be positive').optional(),
    venue: z.string().trim().min(1, 'Venue is required').max(200, 'Venue name too long'),
    enquiryId: z.number().int().positive().optional()
  }),

  // Contract signing
  signContract: z.object({
    clientSignature: z.string().trim().min(2, 'Signature must be at least 2 characters').max(100, 'Signature too long'),
    clientIP: z.string().optional(),
    clientPhone: z.string().optional(),
    clientAddress: z.string().optional(),
    venueAddress: z.string().optional()
  }),

  // Booking creation - extremely flexible validation, only basic checks
  createBooking: z.object({
    title: z.string().optional().nullable(),
    clientName: z.string().optional().nullable(), // Even client name can be empty for incomplete bookings
    clientEmail: z.string().email('Invalid email format').optional().nullable(),
    clientPhone: z.string().optional().nullable(),
    eventDate: z.string().optional().nullable(), // Date is optional to allow saving incomplete bookings
    eventTime: z.string().optional().nullable(),
    eventEndTime: z.string().optional().nullable(),
    venue: z.string().optional().nullable(),
    venueAddress: z.string().optional().nullable(),
    fee: z.union([z.string(), z.number()]).optional().nullable(), // Accept both string and number
    deposit: z.union([z.string(), z.number()]).optional().nullable(), // Accept both string and number
    status: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    gigType: z.string().optional().nullable(),
    equipmentRequirements: z.string().optional().nullable(),
    specialRequirements: z.string().optional().nullable()
  }).refine((data) => {
    // At least some basic info should be provided
    return data.clientName || data.clientEmail || data.clientPhone || data.venue || data.eventDate;
  }, {
    message: "At least one field (client name, email, phone, venue, or date) must be provided"
  }),

  // Invoice creation
  createInvoice: z.object({
    enquiryId: z.number().int().positive('Invalid booking ID'),
    customItems: z.array(z.object({
      description: z.string().trim().min(1, 'Item description required').max(200, 'Description too long'),
      amount: z.number().positive('Amount must be positive')
    })).optional()
  }),

  // User settings update
  updateSettings: z.object({
    businessName: z.string().trim().min(1, 'Business name required').max(100, 'Business name too long').optional(),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().optional(),
    address: z.string().max(500, 'Address too long').optional(),
    defaultInvoiceDueDays: z.number().int().min(1, 'Due days must be at least 1').max(365, 'Due days too large').optional(),
    defaultFee: z.number().positive('Default fee must be positive').optional()
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
  })
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