import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { useQuery } from '@tanstack/react-query';

interface SubscriptionStatus {
  hasValidSubscription: boolean;
  isAdminCreated: boolean;
  stripeCustomerId?: string;
  isSubscribed?: boolean;
  tier?: string;
}

// Hook that monitors subscription status every 30 seconds
export function useSubscriptionWatchdog() {
  const { user, isAuthenticated, logout } = useAuth();
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(false);

  // Query to check subscription status
  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/watchdog-status'],
    enabled: isAuthenticated && !!user,
    refetchInterval: 30000, // Check every 30 seconds
    refetchIntervalInBackground: true,
    staleTime: 0, // Always fetch fresh data
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    // Don't start watchdog if user is admin
    if (user.isAdmin) {
      console.log('🛡️ Admin user detected - subscription watchdog bypassed');
      return;
    }

    isActiveRef.current = true;

    const checkSubscription = () => {
      if (!isActiveRef.current || !subscriptionStatus) return;

      console.log('🔍 Subscription watchdog check:', subscriptionStatus);

      // Bypass check for admin-created users
      if (subscriptionStatus.isAdminCreated) {
        console.log('🛡️ Admin-created user - subscription watchdog bypassed');
        return;
      }

      // Check if user has valid subscription
      const hasValidSubscription = subscriptionStatus.hasValidSubscription;

      if (!hasValidSubscription) {
        console.log('❌ Subscription watchdog: Invalid subscription detected - logging out user');
        
        // Clear the watchdog before logout to prevent race conditions
        if (watchdogRef.current) {
          clearInterval(watchdogRef.current);
          watchdogRef.current = null;
        }
        
        isActiveRef.current = false;
        
        // Redirect to landing page (not login to avoid loops)
        window.location.href = '/?reason=subscription_expired';
      }
    };

    // Initial check
    if (subscriptionStatus) {
      checkSubscription();
    }

    // Set up interval for subsequent checks
    watchdogRef.current = setInterval(checkSubscription, 30000);

    return () => {
      isActiveRef.current = false;
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [isAuthenticated, user, subscriptionStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, []);
}