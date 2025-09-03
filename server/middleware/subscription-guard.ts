import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './firebase-auth';
import { storage } from '../core/storage';
import { hasAccess, getUserStatus } from '../utils/access-control';

// Public routes that don't require any subscription
const PUBLIC_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/register', 
  '/api/auth/refresh',
  '/api/auth/verify-token',
  '/api/auth/password-reset',
  '/api/auth/user', // CRITICAL: Allow users to check auth status
  '/api/onboarding/status', // Allow onboarding flow
  '/api/health',
  '/api/feedback/test-table', // Development testing endpoint
  '/api/health/feedback-schema', // Development schema check
  '/api/health/fix-feedback-table', // Development table fix
  '/api/stripe/webhook',
  '/api/stripe/create-checkout',
  '/api/stripe/portal',
  '/api/stripe/verify-session',
  '/api/mailgun/webhook',
  '/api/google-maps/autocomplete',
  '/api/what3words/convert',
  '/api/debug/encore-email',
  '/api/debug/webhook-logs'
]);

// Routes allowed for pending_payment users (payment management only)
const PENDING_PAYMENT_ALLOWED = new Set([
  '/api/user/profile',
  '/api/subscription/status',
  '/api/subscription/update-payment',
  '/api/subscription/cancel',
  '/api/settings' // Basic settings access for payment setup
]);

// Public contract signing and collaboration routes (no auth required)
const PUBLIC_CONTRACT_PATTERNS = [
  /^\/api\/contracts\/[^\/]+\/sign/,
  /^\/api\/contracts\/[^\/]+\/public/,
  /^\/api\/booking-collaboration/,
  /^\/api\/portal/
];

function isPublicRoute(path: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.has(path)) {
    return true;
  }
  
  // Check pattern matches for contract signing etc.
  return PUBLIC_CONTRACT_PATTERNS.some(pattern => pattern.test(path));
}

function isPendingPaymentAllowed(path: string): boolean {
  return PENDING_PAYMENT_ALLOWED.has(path);
}

export const subscriptionGuard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip if not an API route
    if (!req.path.startsWith('/api/')) {
      return next();
    }

    // Check if route is public (no auth required)
    if (isPublicRoute(req.path)) {
      return next();
    }

    // Cast request to get user info
    const authReq = req as AuthenticatedRequest;
    
    // Verify authentication first
    if (!authReq.user?.id) {
      console.log(`🔒 [SUBSCRIPTION-GUARD] No authenticated user for ${req.path}`);
      return res.status(401).json({ 
        error: 'Authentication required',
        details: 'Please log in to access this resource'
      });
    }

    // Get user subscription status from database
    const user = await storage.getUserById(authReq.user.id);
    if (!user) {
      console.log(`🔒 [SUBSCRIPTION-GUARD] User not found: ${authReq.user.id}`);
      return res.status(401).json({ 
        error: 'User not found',
        details: 'Please log in again'
      });
    }

    // Use new simplified access control system
    const userHasAccess = hasAccess(user);
    const userStatus = getUserStatus(user);
    
    // If user has access, allow them through
    if (userHasAccess) {
      console.log(`✅ [SUBSCRIPTION-GUARD] User ${user.id} (${userStatus.type}) granted access to ${req.path}`);
      return next();
    }
    
    // User doesn't have access - check if they're allowed on payment routes
    if (isPendingPaymentAllowed(req.path)) {
      console.log(`✅ [SUBSCRIPTION-GUARD] User ${user.id} allowed access to payment route: ${req.path}`);
      return next();
    }
    
    // Block access - payment required
    console.log(`🔒 [SUBSCRIPTION-GUARD] User ${user.id} blocked from ${req.path} - ${userStatus.message}`);
    return res.status(402).json({ 
      error: 'Payment Required',
      code: 'SUBSCRIPTION_REQUIRED',
      details: userStatus.message,
      redirectTo: '/subscription/update-payment'
    });

  } catch (error) {
    console.error('❌ [SUBSCRIPTION-GUARD] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: 'Subscription verification failed'
    });
  }
};