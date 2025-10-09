import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './firebase-auth';
import { storage } from '../core/storage';
import { hasAccess, getUserStatus } from '../utils/access-control';

// Public routes that don't require any subscription
const PUBLIC_ROUTES = new Set([
  '/api/auth/check', // Public auth check endpoint
  '/api/auth/login',
  '/api/auth/register', 
  '/api/auth/refresh',
  '/api/auth/verify-token',
  '/api/auth/password-reset',
  '/api/auth/firebase-signup', // Allow Firebase signup flow
  '/api/auth/supabase-signup', // Allow Supabase signup flow
  '/api/auth/user', // CRITICAL: Allow user data fetch for authentication flow
  '/api/health',
  '/api/feedback/test-table', // Development testing endpoint
  '/api/health/feedback-schema', // Development schema check
  '/api/health/fix-feedback-table', // Development table fix
  '/api/stripe/webhook',
  '/api/stripe-webhook', // CRITICAL: Main Stripe webhook endpoint
  '/api/webhook/stripe', // Alternative webhook endpoint
  '/api/stripe/create-checkout',
  '/api/stripe/portal',
  '/api/stripe/verify-session',
  '/api/mailgun/webhook',
  '/api/google-maps/autocomplete',
  '/api/what3words/convert',
  '/api/debug/encore-email',
  '/api/debug/webhook-logs',
  '/api/email/health', // Email monitoring health check
  '/api/email/recovery/check', // Email recovery check
  '/api/email/recovery/process', // Email recovery processing
  '/api/webhook/logs' // Webhook logs monitoring
]);

// Routes allowed for pending_payment users (payment management only)
const PENDING_PAYMENT_ALLOWED = new Set([
  '/api/onboarding/status', // Allow onboarding flow for authenticated users
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
    console.log(`🔍 [SUBSCRIPTION-GUARD] Processing ${req.method} ${req.path}`);

    // Skip if not an API route
    if (!req.path.startsWith('/api/')) {
      console.log(`⏭️ [SUBSCRIPTION-GUARD] Skipping non-API route: ${req.path}`);
      return next();
    }

    // Check if route is public (no auth required)
    if (isPublicRoute(req.path)) {
      console.log(`✅ [SUBSCRIPTION-GUARD] Public route allowed: ${req.path}`);
      return next();
    }

    // Cast request to get user info
    const authReq = req as AuthenticatedRequest;
    
    // If no user is authenticated, skip subscription check
    // The route's own authentication middleware will handle auth requirements
    if (!authReq.user?.id) {
      console.log(`⏭️ [SUBSCRIPTION-GUARD] Skipping check for ${req.path} - no authenticated user (route will handle auth)`);
      return next();
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