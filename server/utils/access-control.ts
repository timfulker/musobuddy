/**
 * Access Control System - Single source of truth for user access
 * Simplified payment enforcement with clear user types
 */

interface User {
  uid?: string;
  email?: string;
  isAdmin?: boolean;
  isAssigned?: boolean;
  isBetaTester?: boolean;
  trialEndsAt?: Date | string | null;
  hasPaid?: boolean;
}

/**
 * Check if a user has access to the platform
 * @param user - User object from database
 * @returns boolean - true if user has access, false if payment required
 */
export function hasAccess(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Use camelCase field names from database
  const isAdmin = user.isAdmin;
  const isAssigned = user.isAssigned;
  const trialEndsAt = user.trialEndsAt;
  const hasPaid = user.hasPaid;
  
  // Admins always have access
  if (isAdmin) return true;
  
  // Assigned accounts always have access (complimentary accounts only, NOT test accounts)
  // Test accounts must go through normal payment flow in Stripe test mode
  if (isAssigned && !user.email?.includes('+test')) return true;
  
  // HARD RULE: No dashboard access without payment setup (has_paid = true)
  // This includes trial users - they must complete payment setup to access dashboard
  return hasPaid === true;
}

/**
 * Get detailed user status information
 * @param user - User object from database
 * @returns Status object with type and message
 */
export function getUserStatus(user: User | null | undefined) {
  if (!user) return { type: 'unauthenticated', message: 'Not logged in' };
  
  // Use camelCase field names from database
  const isAdmin = user.isAdmin;
  const isAssigned = user.isAssigned;
  const isBetaTester = user.isBetaTester;
  const trialEndsAt = user.trialEndsAt;
  const hasPaid = user.hasPaid;
  
  // Check user type
  if (isAdmin) return { type: 'admin', message: 'Admin Account' };
  
  // Test accounts are NOT assigned accounts - they go through normal payment flow in test mode
  if (user.email?.includes('+test')) {
    // Test accounts follow the same flow as regular users but use Stripe test mode
    // They are NOT complimentary accounts
  }
  
  if (isAssigned) {
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
 * Validate email for signup (prevent regular users from creating test accounts)
 * @param email - Email address to validate
 * @throws Error if email is invalid
 */
export function validateEmailForSignup(email: string): boolean {
  if (email.includes('+test')) {
    throw new Error('Invalid email format. Test accounts can only be created by admins.');
  }
  return true;
}