import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  // 1. User has completed Stripe verification
  // 2. User hasn't completed onboarding
  // 3. User hasn't dismissed the wizard
  const shouldShowWizard = onboardingStatus && 
    onboardingStatus.stripeVerified && 
    !onboardingStatus.onboardingCompleted && 
    !wizardDismissed;

  if (shouldShowWizard) {
    return (
      <>
        {children}
        <OnboardingWizard 
          isOpen={true} 
          onComplete={() => window.location.reload()}
          onDismiss={() => setWizardDismissed(true)}
          user={user}
        />
      </>
    );
  }

  return <>{children}</>;
}