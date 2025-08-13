import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import OnboardingWizard from "./onboarding-wizard";

interface OnboardingWrapperProps {
  children: React.ReactNode;
}

export default function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { isAuthenticated, user } = useAuth();

  const { data: onboardingStatus, isLoading } = useQuery({
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

  // Show onboarding wizard if user hasn't completed it
  if (onboardingStatus && !onboardingStatus.onboardingCompleted) {
    return (
      <>
        {children}
        <OnboardingWizard 
          isOpen={true} 
          onComplete={() => window.location.reload()}
          user={user}
        />
      </>
    );
  }

  return <>{children}</>;
}