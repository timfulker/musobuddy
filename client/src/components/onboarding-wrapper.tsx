import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { isPublicRoute, hasAccess } from "@/lib/access-control";
import OnboardingWizard from "./onboarding-wizard";

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
  const [wizardDismissed, setWizardDismissed] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Check if we're in the middle of a signup flow
  const isSignupInProgress = localStorage.getItem('signup-in-progress') === 'true';

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

  // Only show onboarding wizard if:
  // 1. User hasn't completed onboarding
  // 2. User hasn't dismissed the wizard
  // 3. Not in the middle of signup flow (prevents interference with payment redirect)
  // 4. Not on a public route (prevents wizard showing on landing page, etc.)
  // 5. User has PAID (not just trial access) - wizard only shows AFTER payment
  const shouldShowWizard = onboardingStatus && 
    !onboardingStatus.onboardingCompleted && 
    !wizardDismissed &&
    !isSignupInProgress &&
    !isPublicRoute(location) &&
    user?.hasPaid === true; // Only show wizard if user has actually paid (not trial users)

  if (shouldShowWizard) {
    return (
      <>
        {children}
        <OnboardingWizard 
          isOpen={true} 
          onComplete={() => {
            // Mark as dismissed and redirect to dashboard
            setWizardDismissed(true);
            // Use wouter for navigation to prevent page reload
            setLocation('/dashboard');
          }}
          onDismiss={() => setWizardDismissed(true)}
          user={user}
        />
      </>
    );
  }

  return <>{children}</>;
}