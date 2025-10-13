import { Request, Response, NextFunction } from 'express';

/**
 * Development Fallback Middleware
 * 
 * In development mode when database connectivity fails, this middleware
 * intercepts common API endpoints and returns empty/fallback data
 * to allow the frontend to load and function properly.
 */

export function createDevelopmentFallback() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only apply in development mode
    if (process.env.NODE_ENV !== 'development') {
      return next();
    }

    const originalSend = res.json;
    
    // Override res.json to catch database errors and provide fallbacks
    res.json = function(data: any) {
      return originalSend.call(this, data);
    };

    // Override error handling
    const originalNext = next;
    next = function(error: any) {
      // Check if this is a database connectivity error
      if (error && (
        error.message?.includes('getaddrinfo ENOTFOUND') ||
        error.message?.includes('connect ECONNREFUSED') ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED'
      )) {
        console.log(`🚧 [DEV-FALLBACK] Database error on ${req.method} ${req.path}, providing fallback data`);
        
        // Return appropriate fallback data based on endpoint
        if (req.path.includes('/bookings')) {
          return res.json([]);
        } else if (req.path.includes('/contracts')) {
          return res.json([]);
        } else if (req.path.includes('/invoices')) {
          return res.json([]);
        } else if (req.path.includes('/clients')) {
          return res.json([]);
        } else if (req.path.includes('/notifications/counts')) {
          return res.json({
            newBookings: 0,
            unparseableMessages: 0,
            overdueInvoices: 0,
            expiredDocuments: 0
          });
        } else if (req.path.includes('/notifications/messages')) {
          return res.json([]);
        } else if (req.path.includes('/conflicts')) {
          return res.json([]);
        } else if (req.path.includes('/compliance')) {
          return res.json([]);
        } else if (req.path.includes('/settings')) {
          return res.json({
            travelExpenseSettings: null,
            smsNotifications: false,
            emailSignature: '',
            autoResponderEnabled: false,
            defaultContractTerms: '',
            themeColor: '#191970',
            themeName: 'midnight-blue'
          });
        } else if (req.path.includes('/blocked-dates')) {
          return res.json([]);
        } else {
          // Generic fallback
          return res.json([]);
        }
      }
      
      // Not a database error, proceed normally
      return originalNext.call(this, error);
    };

    next();
  };
}

/**
 * Route-specific development fallbacks
 * Call these in individual route handlers when database operations fail
 */
export const developmentFallbacks = {
  bookings: () => [],
  contracts: () => [],
  invoices: () => [],
  clients: () => [],
  settings: () => ({
    travelExpenseSettings: null,
    smsNotifications: false,
    emailSignature: '',
    autoResponderEnabled: false,
    defaultContractTerms: '',
    themeColor: '#191970',
    themeName: 'midnight-blue'
  }),
  notificationCounts: () => ({
    newBookings: 0,
    unparseableMessages: 0,
    overdueInvoices: 0,
    expiredDocuments: 0
  }),
  conflicts: () => [],
  compliance: () => [],
  blockedDates: () => []
};