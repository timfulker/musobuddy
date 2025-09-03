import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isPublicRoute, hasAccess } from "@/lib/access-control";
import WelcomePage from "./welcome-page";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

interface OnboardingStatus {
  onboardingCompleted: boolean;
  stripeVerified: boolean;
  user?: any;
}

export default function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { isAuthenticated, user } = useAuth();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Check if we're in the middle of a signup flow
  const isSignupInProgress = localStorage.getItem('signup-in-progress') === 'true';
  
  // Check if user has already seen the welcome page (persists across sessions)
  const hasSeenWelcome = localStorage.getItem(`welcome-seen-${user?.id}`) === 'true';

  const { data: onboardingStatus, isLoading } = useQuery<OnboardingStatus>({
    queryKey: ['/api/onboarding/status'],
    enabled: isAuthenticated && !!user,
  });

  // Don't show onboarding for unauthenticated users
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Show loading state while checking onboarding status
  if (isLoading) {
    return <>{children}</>;
  }

  // Only show welcome page if:
  // 1. User hasn't seen the welcome page before (first time only, not on subsequent logins)
  // 2. User hasn't dismissed the welcome page in this session
  // 3. Not in the middle of signup flow (prevents interference with payment redirect)
  // 4. Not on a public route (prevents welcome showing on landing page, etc.)
  // 5. User has PAID (not just trial access) - welcome only shows AFTER payment
  // Note: Removed onboardingCompleted check - welcome shows regardless of completion status
  const shouldShowWelcome = onboardingStatus && 
    !welcomeDismissed &&
    !hasSeenWelcome &&
    !isSignupInProgress &&
    !isPublicRoute(location) &&
    user?.hasPaid === true; // Only show welcome if user has actually paid (not trial users)

  if (shouldShowWelcome) {
    return (
      <>
        {children}
        <WelcomePage 
          onComplete={() => {
            // Mark as seen for future logins
            localStorage.setItem(`welcome-seen-${user?.id}`, 'true');
            // Mark as dismissed for this session
            setWelcomeDismissed(true);
          }}
          user={user}
        />
      </>
    );
  }

  return <>{children}</>;
}