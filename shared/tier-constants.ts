/**
 * Tier System Constants
 * Industry-standard tier structure for MusoBuddy SaaS
 */

// Tier enum - The canonical list of all tiers
export const TIERS = {
  // Unpaid states
  PENDING_PAYMENT: 'pending_payment', // User needs to complete payment
  CANCELLED: 'cancelled',              // Subscription was cancelled
  
  // Paid tiers
  CORE: 'core',                        // Entry-level paid tier
  PREMIUM: 'premium',                  // Mid-tier subscription  
  ENTERPRISE: 'enterprise',            // High-tier with custom pricing
  
  // Legacy (to be migrated)
  FREE: 'free'                         // Legacy tier (confusing name - actually means admin)
} as const;

export type TierType = typeof TIERS[keyof typeof TIERS];

// Tier configuration
export const TIER_CONFIG = {
  [TIERS.PENDING_PAYMENT]: {
    displayName: 'Payment Required',
    description: 'Complete payment to access MusoBuddy',
    features: [],
    requiresPayment: true,
    accessLevel: 'none'
  },
  [TIERS.CANCELLED]: {
    displayName: 'Cancelled',
    description: 'Subscription cancelled',
    features: [],
    requiresPayment: true,
    accessLevel: 'none'
  },
  [TIERS.CORE]: {
    displayName: 'Core',
    description: 'Essential features for musicians',
    features: [
      'Unlimited bookings',
      'Digital contracts',
      'Invoice generation',
      'Email notifications',
      'Basic templates'
    ],
    requiresPayment: false, // Already paid
    accessLevel: 'full'
  },
  [TIERS.PREMIUM]: {
    displayName: 'Premium',
    description: 'Advanced features for professionals',
    features: [
      'All Core features',
      'SMS notifications',
      'Priority support',
      'Advanced templates',
      'API access',
      'Custom branding'
    ],
    requiresPayment: false, // Already paid
    accessLevel: 'full'
  },
  [TIERS.ENTERPRISE]: {
    displayName: 'Enterprise',
    description: 'Custom solutions for organizations',
    features: [
      'All Premium features',
      'Dedicated support',
      'Custom integrations',
      'White labeling',
      'SLA guarantees',
      'Training included'
    ],
    requiresPayment: false, // Already paid
    accessLevel: 'full'
  },
  [TIERS.FREE]: {
    displayName: 'Legacy Admin',
    description: 'Legacy tier - to be migrated',
    features: ['Full access'],
    requiresPayment: false,
    accessLevel: 'full'
  }
} as const;

// Helper functions
export function isPaidTier(tier: string | undefined | null): boolean {
  if (!tier) return false;
  return [TIERS.CORE, TIERS.PREMIUM, TIERS.ENTERPRISE].includes(tier as TierType);
}

export function requiresPayment(tier: string | undefined | null): boolean {
  if (!tier) return true;
  
  const config = TIER_CONFIG[tier as TierType];
  return config?.requiresPayment ?? true;
}

export function getTierDisplayName(tier: string | undefined | null): string {
  if (!tier) return 'No Subscription';
  
  const config = TIER_CONFIG[tier as TierType];
  return config?.displayName ?? tier;
}

export function getTierFeatures(tier: string | undefined | null): string[] {
  if (!tier) return [];
  
  const config = TIER_CONFIG[tier as TierType];
  return config?.features ?? [];
}

// Migration mapping (for future use)
export const TIER_MIGRATION_MAP = {
  'free': TIERS.CORE,         // Migrate 'free' users to 'core' (after verifying payment)
  'trial': TIERS.PENDING_PAYMENT,
  'basic': TIERS.CORE,
  'pro': TIERS.PREMIUM,
  'professional': TIERS.PREMIUM,
  'business': TIERS.ENTERPRISE
} as const;