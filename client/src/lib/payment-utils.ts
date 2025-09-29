// Simplified payment enforcement utility functions

interface User {
  email?: string;
  isAdmin?: boolean;
  isAssigned?: boolean;
  isBetaTester?: boolean;
  hasPaid?: boolean;
  trialEndsAt?: string | null;
}

/**
 * Check if a user has access to the platform using proper database-driven access control
 */
export function hasAccess(user: User | null | undefined): boolean {
  if (!user) return false;

  // Admin users always have access
  if (user.isAdmin) return true;

  // Assigned users always have access (but NOT test accounts)
  if (user.isAssigned && !user.email?.includes('+test')) return true;

  // HARD RULE: No dashboard access without payment setup (has_paid = true)
  // This includes trial users - they must complete payment setup to access dashboard
  return user.hasPaid === true;
}

/**
 * Check if a user requires payment to access the platform
 */
export function requiresPayment(user: User | null | undefined): boolean {
  return !hasAccess(user);
}

/**
 * Check if a user has a valid subscription (same as hasAccess now)
 */
export function hasValidSubscription(user: User | null | undefined): boolean {
  return hasAccess(user);
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
    '/watchdog',
    '/messages',
    '/calendar'
  ];
  
  return protectedRoutes.some(route => path.startsWith(route));
}

/**
 * Check if user is in trial period
 */
export function isInTrial(user: User | null | undefined): boolean {
  if (!user || !user.trialEndsAt) return false;
  
  const trialEnd = new Date(user.trialEndsAt);
  return trialEnd > new Date() && !user.hasPaid;
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(user: User | null | undefined): number {
  if (!user || !user.trialEndsAt) return 0;
  
  const trialEnd = new Date(user.trialEndsAt);
  const now = new Date();
  
  if (trialEnd <= now) return 0;
  
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((trialEnd.getTime() - now.getTime()) / msPerDay);
}