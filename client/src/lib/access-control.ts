/**
 * Client-side Access Control System
 * Mirrors server-side logic for consistent access checking
 */

interface User {
  uid?: string;
  email?: string;
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
    console.log('✅ Admin user has full access');
    return true;
  }
  
  // Assigned accounts always have access (includes test accounts)
  if (isAssigned) {
    console.log('✅ Assigned account has full access');
    return true;
  }
  
  // Check if still in trial period
  if (trialEndsAt) {
    const trialEndDate = new Date(trialEndsAt);
    const now = new Date();
    if (now < trialEndDate) {
      const daysLeft = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`✅ User in trial period (${daysLeft} days remaining)`);
      return true;
    }
  }
  
  // Trial expired - must have paid
  if (hasPaid) {
    console.log('✅ Paid user has full access');
    return true;
  }
  
  console.log('🔒 Access denied - payment required');
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