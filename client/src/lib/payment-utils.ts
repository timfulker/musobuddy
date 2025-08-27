// Payment enforcement utility functions

interface User {
  email?: string;
  tier?: string;
  plan?: string;
  created_via_stripe?: boolean;
  createdViaStripe?: boolean;
  isAdmin?: boolean;
  is_subscribed?: boolean;
  subscription_status?: string;
  hasCompletedPayment?: boolean;
}

// Admin bypass emails - these users always have full access
const ADMIN_BYPASS_EMAILS = [
  'timfulker@gmail.com', 
  'timfulkermusic@gmail.com', 
  'jake.stanley@musobuddy.com'
];

/**
 * Check if a user requires payment to access the platform
 * This is the central payment enforcement logic
 */
export function requiresPayment(user: User | null | undefined): boolean {
  // No user = requires payment
  if (!user) {
    console.log('🔒 Payment required: No user object');
    return true;
  }

  // Admin users and bypass emails never require payment
  const isAdminUser = user.isAdmin || (user.email && ADMIN_BYPASS_EMAILS.includes(user.email));
  if (isAdminUser) {
    console.log('✅ Admin user bypass:', user.email);
    return false;
  }

  // Check multiple conditions to prevent bypass
  const conditions = {
    hasPendingPaymentTier: user.tier === 'pending_payment',
    hasNoTier: !user.tier || user.tier === undefined,
    notCreatedViaStripe: !user.created_via_stripe && !user.createdViaStripe,
    hasFreeTierWithoutAdmin: user.tier === 'free' && !isAdminUser,
    explicitlyNotPaid: user.hasCompletedPayment === false
  };

  const needsPayment = Object.values(conditions).some(condition => condition);

  if (needsPayment) {
    console.log('🔒 Payment required for user:', {
      email: user.email,
      tier: user.tier,
      conditions: Object.entries(conditions)
        .filter(([_, value]) => value)
        .map(([key]) => key)
    });
  }

  return needsPayment;
}

/**
 * Check if a user has a valid paid subscription
 */
export function hasValidSubscription(user: User | null | undefined): boolean {
  if (!user) return false;

  // Admin bypass
  const isAdminUser = user.isAdmin || (user.email && ADMIN_BYPASS_EMAILS.includes(user.email));
  if (isAdminUser) return true;

  // Valid paid tiers
  const validPaidTiers = ['core', 'premium', 'enterprise'];
  const hasValidTier = user.tier && validPaidTiers.includes(user.tier.toLowerCase());
  
  // Must have been created via Stripe (except admins)
  const wasCreatedViaStripe = user.created_via_stripe || user.createdViaStripe;
  
  return hasValidTier && wasCreatedViaStripe;
}

/**
 * Get the redirect URL for users who need to complete payment
 */
export function getPaymentRedirectUrl(): string {
  return '/subscription/update-payment';
}

/**
 * Check if a route is protected and requires authentication/payment
 */
export function isProtectedRoute(path: string): boolean {
  const protectedRoutes = [
    '/dashboard',
    '/bookings',
    '/new-booking',
    '/contracts',
    '/invoices',
    '/settings',
    '/compliance',
    '/templates',
    '/address-book',
    '/admin',
    '/feedback',
    '/unparseable-messages',
    '/messages',
    '/conversation',
    '/email-setup',
    '/system-health',
    '/mobile-invoice-sender'
  ];
  
  return protectedRoutes.some(route => path.startsWith(route));
}