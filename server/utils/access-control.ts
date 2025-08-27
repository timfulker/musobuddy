/**
 * Access Control System - Single source of truth for user access
 * Simplified payment enforcement with clear user types
 */

interface User {
  uid?: string;
  email?: string;
  is_admin?: boolean;
  isAdmin?: boolean;
  is_assigned?: boolean;
  isAssigned?: boolean;
  is_beta_tester?: boolean;
  isBetaTester?: boolean;
  trial_ends_at?: Date | string | null;
  trialEndsAt?: Date | string | null;
  has_paid?: boolean;
  hasPaid?: boolean;
}

/**
 * Check if a user has access to the platform
 * @param user - User object from database
 * @returns boolean - true if user has access, false if payment required
 */
export function hasAccess(user: User | null | undefined): boolean {
  if (!user) return false;
  
  // Handle both snake_case and camelCase field names
  const isAdmin = user.is_admin || user.isAdmin;
  const isAssigned = user.is_assigned || user.isAssigned;
  const trialEndsAt = user.trial_ends_at || user.trialEndsAt;
  const hasPaid = user.has_paid || user.hasPaid;
  
  // Admins always have access
  if (isAdmin) return true;
  
  // Assigned accounts always have access (includes test accounts)
  if (isAssigned) return true;
  
  // Check if still in trial period
  if (trialEndsAt) {
    const trialEndDate = new Date(trialEndsAt);
    if (new Date() < trialEndDate) {
      return true;
    }
  }
  
  // Trial expired - must have paid
  return hasPaid === true;
}

/**
 * Get detailed user status information
 * @param user - User object from database
 * @returns Status object with type and message
 */
export function getUserStatus(user: User | null | undefined) {
  if (!user) return { type: 'unauthenticated', message: 'Not logged in' };
  
  // Handle both snake_case and camelCase field names
  const isAdmin = user.is_admin || user.isAdmin;
  const isAssigned = user.is_assigned || user.isAssigned;
  const isBetaTester = user.is_beta_tester || user.isBetaTester;
  const trialEndsAt = user.trial_ends_at || user.trialEndsAt;
  const hasPaid = user.has_paid || user.hasPaid;
  
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
      days_remaining: daysLeft,
      trial_ends_at: trialEnd
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