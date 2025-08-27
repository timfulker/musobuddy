import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './firebase-auth';
import { storage } from '../core/storage';

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
  '/api/stripe/webhook',
  '/api/stripe/create-checkout',
  '/api/stripe/portal',
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

    // Admin users bypass all subscription checks
    if (user.isAdmin) {
      console.log(`✅ [SUBSCRIPTION-GUARD] Admin user ${user.id} bypassed subscription check for ${req.path}`);
      return next();
    }

    // Check hardcoded email exemptions (existing system)
    const allowedBypassEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com'];
    if (allowedBypassEmails.includes(user.email)) {
      console.log(`✅ [SUBSCRIPTION-GUARD] Exempt user ${user.id} (${user.email}) bypassed subscription check for ${req.path}`);
      return next();
    }

    // STRICT PAYMENT ENFORCEMENT
    const userTier = user.tier || 'pending_payment';
    const createdViaStripe = user.created_via_stripe || false;
    
    // Check if user needs payment (multiple conditions)
    const needsPayment = (
      userTier === 'pending_payment' ||
      !userTier ||
      userTier === undefined ||
      (!createdViaStripe && !allowedBypassEmails.includes(user.email)) ||
      (userTier === 'free' && !allowedBypassEmails.includes(user.email)) // 'free' tier without admin bypass = needs payment
    );
    
    if (needsPayment) {
      // Allow limited access to payment-related routes
      if (isPendingPaymentAllowed(req.path)) {
        console.log(`✅ [SUBSCRIPTION-GUARD] Unpaid user ${user.id} allowed access to payment route: ${req.path}`);
        return next();
      }
      
      console.log(`🔒 [SUBSCRIPTION-GUARD] Unpaid user ${user.id} blocked from ${req.path} (tier: ${userTier}, stripe: ${createdViaStripe})`);
      return res.status(402).json({ 
        error: 'Payment Required',
        code: 'SUBSCRIPTION_PENDING',
        details: 'Please complete your subscription setup to access this feature',
        redirectTo: '/subscription/update-payment'
      });
    }

    // Valid paid tiers (must also be created via Stripe unless admin)
    const validPaidTiers = ['core', 'premium', 'enterprise'];
    const hasValidPaidTier = validPaidTiers.includes(userTier) && createdViaStripe;
    
    if (hasValidPaidTier) {
      console.log(`✅ [SUBSCRIPTION-GUARD] Paid user ${user.id} with tier '${userTier}' granted access to ${req.path}`);
      return next();
    }

    // Block all other cases (shouldn't reach here with proper enforcement above)
    console.log(`🔒 [SUBSCRIPTION-GUARD] User ${user.id} blocked - unexpected state (tier: ${userTier}, stripe: ${createdViaStripe})`);
    return res.status(403).json({ 
      error: 'Subscription required',
      details: 'Invalid subscription status',
      tier: userTier,
      createdViaStripe: createdViaStripe
    });

  } catch (error) {
    console.error('❌ [SUBSCRIPTION-GUARD] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: 'Subscription verification failed'
    });
  }
};