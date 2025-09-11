/**
 * Client-side Access Control System
 * Mirrors server-side logic for consistent access checking
 */

interface User {
  uid?: string;
  email?: string;
  emailVerified?: boolean;  // Firebase email verification status
  isAdmin?: boolean;
  isAssigned?: boolean;
  isBetaTester?: boolean;
  trialEndsAt?: Date | string | null;
  hasPaid?: boolean;
  // Support both camelCase and snake_case from API
  is_admin?: boolean;
  is_assigned?: boolean;
  is_beta_tester?: boolean;
  trial_ends_at?: Date | string | null;
  has_paid?: boolean;
}

/**
 * Check if user's email is verified (required for payment access)
 * @param user - User object from auth context
 * @returns boolean - true if email is verified or user doesn't need verification
 */
export function hasVerifiedEmail(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Handle both snake_case and camelCase field names
  const isAdmin = user.isAdmin || user.is_admin;
  const isAssigned = user.isAssigned || user.is_assigned;
  
  // Admins and assigned accounts bypass email verification requirement
  if (isAdmin || isAssigned) {
    return true;
  }
  
  // All other users must have verified email
  return user.emailVerified === true;
}

/**
 * Check if a user has access to the platform
 * @param user - User object from auth context
 * @returns boolean - true if user has access, false if payment required
 */
export function hasAccess(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Handle both snake_case and camelCase field names
  const isAdmin = user.isAdmin || user.is_admin;
  const isAssigned = user.isAssigned || user.is_assigned;
  const trialEndsAt = user.trialEndsAt || user.trial_ends_at;
  const hasPaid = user.hasPaid || user.has_paid;
  
  
  // Admins always have access
  if (isAdmin) {
    return true;
  }
  
  // Assigned accounts always have access (complimentary accounts only, NOT test accounts)
  if (isAssigned) {
    return true;
  }
  
  // HARD RULE: Paid users get access regardless of email verification
  // Payment completion (especially via Stripe) is sufficient verification of ownership
  if (hasPaid) {
    return true;
  }
  
  // SECURITY: Email verification required for trial/unpaid access
  if (!hasVerifiedEmail(user)) {
    return false;
  }
  
  return false;
}

/**
 * Get detailed user status information
 * @param user - User object from auth context
 * @returns Status object with type and message
 */
export function getUserStatus(user: User | null | undefined) {
  if (!user) return { type: 'unauthenticated', message: 'Not logged in' };
  
  // Handle both snake_case and camelCase field names
  const isAdmin = user.isAdmin || user.is_admin;
  const isAssigned = user.isAssigned || user.is_assigned;
  const isBetaTester = user.isBetaTester || user.is_beta_tester;
  const trialEndsAt = user.trialEndsAt || user.trial_ends_at;
  const hasPaid = user.hasPaid || user.has_paid;
  
  // Check user type
  if (isAdmin) return { type: 'admin', message: 'Admin Account' };
  
  if (isAssigned) {
    if (user.email?.includes('+test')) {
      return { type: 'test', message: 'Test Account' };
    }
    return { type: 'assigned', message: 'Complimentary Account' };
  }
  
  // Check trial status
  const now = new Date();
  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  
  if (trialEnd && now < trialEnd) {
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { 
      type: isBetaTester ? 'beta_trial' : 'trial',
      message: `${daysLeft} days left in ${isBetaTester ? 'beta access' : 'trial'}`,
      daysRemaining: daysLeft,
      trialEndsAt: trialEnd
    };
  }
  
  // Post-trial status
  if (hasPaid) {
    return { type: 'paid', message: 'Active Subscription' };
  }
  
  return { type: 'expired', message: 'Trial Expired - Payment Required' };
}

/**
 * Check if email is a test account
 * @param email - User email address
 * @returns boolean - true if test account
 */
export function isTestAccount(email: string | null | undefined): boolean {
  return email ? email.includes('+test') : false;
}

/**
 * Get payment redirect URL
 * @returns string - URL to redirect for payment
 */
export function getPaymentRedirectUrl(): string {
  return '/subscription/update-payment';
}

/**
 * Get email verification redirect URL
 * @returns string - URL to redirect for email verification
 */
export function getVerificationRedirectUrl(): string {
  return '/auth/verify-email';
}

/**
 * Check if a route is protected and requires authentication/payment
 * @param path - Route path to check
 * @returns boolean - true if route requires authentication
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

/**
 * Check if a route is public and accessible without authentication
 * @param path - Route path to check
 * @returns boolean - true if route is publicly accessible
 */
export function isPublicRoute(path: string): boolean {
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/start-trial',
    '/terms-and-conditions',
    '/trial-success',
    '/success',
    '/logout',
    '/subscription/update-payment'
  ];
  
  // Check for exact matches first
  if (publicRoutes.includes(path)) {
    return true;
  }
  
  // Check for patterns that should be public
  const publicPatterns = [
    /^\/sign-contract\/[^\/]+$/,
    /^\/view-contract\/[^\/]+$/,
    /^\/view-invoice\/[^\/]+$/,
    /^\/widget\/[^\/]+$/,
    /^\/invoice\/[^\/]+$/,
    /^\/api\/portal\/[^\/]+/, // Client portal routes (with token authentication)
    /^\/booking\/[^\/]+\/collaborate/ // Booking collaboration routes
  ];
  
  return publicPatterns.some(pattern => pattern.test(path));
}