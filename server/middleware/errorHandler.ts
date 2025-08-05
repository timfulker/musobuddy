import type { Request, Response, NextFunction } from 'express';

// Custom application error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.name = 'AppError';

    Error.captureStackTrace(this, this.constructor);
  }
}

// Centralized error handling middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error properties
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = err.code;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  }

  // Log error details (but not for client errors)
  if (statusCode >= 500) {
    console.error('Server Error:', {
      message,
      statusCode,
      code,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      userId: (req as any).session?.userId
    });
  } else {
    console.warn('Client Error:', {
      message,
      statusCode,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Build error response
  const errorResponse: any = {
    error: message,
    status: 'error',
    statusCode,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Add error code if available
  if (code) {
    errorResponse.code = code;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    errorResponse.stack = err.stack;
  }

  // Include additional error details for validation errors
  if (err.details) {
    errorResponse.details = err.details;
  }

  // Send error response with appropriate status code
  if (!res.headersSent) {
    res.status(statusCode).json(errorResponse);
  }
};

// Async error wrapper - catches async errors and passes to error handler
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Resource not found',
    status: 'error',
    statusCode: 404,
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

// Standard success response helper
export const sendSuccess = (
  res: Response,
  data: any,
  message: string = 'Success',
  statusCode: number = 200
) => {
  res.status(statusCode).json({
    status: 'success',
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Standard error response helper
export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  details?: any
) => {
  const errorResponse: any = {
    error: message,
    status: 'error',
    statusCode,
    timestamp: new Date().toISOString()
  };

  if (details) {
    errorResponse.details = details;
  }

  res.status(statusCode).json(errorResponse);
};