import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import { HelpTooltipProvider } from "@/contexts/TooltipContext";
import { hasAccess, isProtectedRoute, isPublicRoute, getPaymentRedirectUrl } from "@/lib/access-control";
import ErrorBoundary from "@/components/ErrorBoundary";
import SuccessPage from "@/pages/success";
import NotFound from "@/pages/not-found";
// All authentication pages removed - using clean JWT system
import Dashboard from "@/pages/dashboard";
import Bookings from "@/pages/bookings";
import Contracts from "@/pages/contracts";
import Invoices from "@/pages/invoices";
import Compliance from "@/pages/compliance";
import Settings from "@/pages/Settings";
import AccountSettings from "@/pages/account-settings";
import Templates from "@/pages/templates";
import SignContract from "@/pages/sign-contract";
import ViewContract from "@/pages/view-contract";

import ViewInvoice from "@/pages/view-invoice";
import PublicInvoice from "@/pages/public-invoice";
import QuickAddWidget from "@/pages/quick-add-widget";
import NewBooking from "@/pages/new-booking";
import AddressBook from "@/pages/address-book";
import BetaChecklist from "@/pages/beta-checklist";
import Admin from "@/pages/admin";
import Feedback from "@/pages/feedback";
import MonitoringDashboard from "@/pages/monitoring";
import PromoMetronomePage from "@/pages/promo-metronome";

import EmailSetup from "@/pages/email-setup";
import UnparseableMessages from "@/pages/unparseable-messages";
import Messages from "@/pages/messages";
import EmailFailures from "@/pages/email-failures";
import Conversation from "@/pages/conversation";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import ResetPasswordPage from "@/pages/auth/reset-password";
import { EmailVerification } from "@/pages/auth/email-verification";
import { AuthCallback } from "@/pages/auth/auth-callback";
import StartTrial from "@/pages/start-trial";
import TrialSuccessPage from "@/pages/trial-success";
// Public versions of legal pages (no navigation)
import PublicTermsAndConditions from "@/pages/public/terms-and-conditions";
import PublicPrivacyPolicy from "@/pages/public/privacy-policy";
import PublicCookiePolicy from "@/pages/public/cookie-policy";
import PublicRefundPolicy from "@/pages/public/refund-policy";
import PublicAcceptableUsePolicy from "@/pages/public/acceptable-use-policy";
import PublicDataProcessingAgreement from "@/pages/public/data-processing-agreement";
import PublicDisclaimer from "@/pages/public/disclaimer";
// Internal versions of legal pages (with navigation)
import TermsAndConditions from "@/pages/terms-and-conditions";
import PrivacyPolicy from "@/pages/privacy-policy";
import CookiePolicy from "@/pages/cookie-policy";
import RefundPolicy from "@/pages/refund-policy";
import AcceptableUsePolicy from "@/pages/acceptable-use-policy";
import DataProcessingAgreement from "@/pages/data-processing-agreement";
import Disclaimer from "@/pages/disclaimer";
import CookiePreferences from "@/pages/cookie-preferences";
import CookieConsentBanner from "@/components/cookie-consent-banner";
import SystemHealth from "@/pages/system-health";
import MobileInvoiceSender from "@/pages/mobile-invoice-sender";
import GoogleCalendarCallback from "@/pages/google-calendar-callback";
// import OnboardingWrapper from "@/components/onboarding-wrapper"; // Temporarily removed
import BookingSummary from "@/pages/booking-summary";
import BookingCollaborate from "@/pages/booking-collaborate";
import LogoutPage from "@/pages/logout";
import SubscriptionUpdatePayment from "@/pages/subscription-update-payment";
import DuplicateManager from "@/pages/DuplicateManager";

import { useEffect, lazy, useState } from "react";
import MobileNav from "@/components/mobile-nav";
import WelcomePage from "@/components/welcome-page";
import { useQuery } from "@tanstack/react-query";

function Router() {
  const { isAuthenticated, isLoading, user, error, refreshUserData } = useAuthContext();
  const [location, setLocation] = useLocation();
  const [showWelcomePage, setShowWelcomePage] = useState(false);

  // Fetch settings to check completion
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    enabled: !!user && isAuthenticated,
  });

  // Calculate settings completion
  const isSettingsComplete = () => {
    if (!settings) return false;

    const requiredFields = [
      'primaryInstrument',
      'addressLine1',
      'city',
      'postcode',
      'businessContactEmail',
      'emailPrefix',
      'bankDetails'
    ];

    const completedFields = requiredFields.filter(field => {
      if (field === 'bankDetails') {
        return settings.bankDetails && Object.keys(settings.bankDetails).length > 0;
      }
      return settings[field] && settings[field].trim() !== '';
    });

    return completedFields.length === requiredFields.length;
  };

  // Use useEffect for navigation to prevent render loops
  useEffect(() => {
    // Note: Removed preview environment skip to ensure access control works in Replit

    if (isLoading) return; // Skip navigation logic while loading

    // Check if we should show welcome page for authenticated users with incomplete settings
    // BUT NOT during initial signup flow (when user hasn't completed payment)
    // AND only if they haven't dismissed it this session
    if (isAuthenticated && user && settings !== undefined) {
      const settingsComplete = isSettingsComplete();
      const isNewSignup = !user.hasPaid; // Users who haven't paid are still in signup flow
      const welcomeDismissedThisSession = sessionStorage.getItem('welcome-dismissed') === 'true';

      const shouldShowWelcome = !settingsComplete &&
        !isNewSignup && // Don't show welcome during signup flow
        !welcomeDismissedThisSession && // Don't show if dismissed this session
        location !== '/settings' &&
        location !== '/logout' &&
        !location.startsWith('/sign-contract/') &&
        !location.startsWith('/view-contract/') &&
        !location.startsWith('/invoice/') &&
        !location.startsWith('/widget/');

      setShowWelcomePage(shouldShowWelcome);
    }
    
    // PRIORITY: Handle unauthenticated users immediately
    if (!isAuthenticated) {
      // If on a protected route, redirect to login immediately
      if (isProtectedRoute(location)) {
        console.log('🔀 Redirecting unauthenticated user from protected route to login');
        setLocation('/login');
        return;
      }
      // If on a non-public route that's not protected, also redirect to login
      if (!isPublicRoute(location)) {
        console.log('🔀 Redirecting unauthenticated user to login');
        setLocation('/login');
        return;
      }
      // User is unauthenticated but on a public route - allow them to stay
      return;
    }
    
    // From here on, user is authenticated, so we need user data
    if (!user) return; // Skip further logic if no user data available
    
    const currentPath = location;
    const hasStripeSession = window.location.search.includes('stripe_session');
    const isPaymentReturn = window.location.search.includes('session_id') || currentPath === '/payment-success';
    const isTrialSuccess = currentPath === '/trial-success';
    
    // Use new simplified access control logic
    const hasUserAccess = hasAccess(user);
    const needsPaymentSetup = !hasUserAccess;
    const isProtected = isProtectedRoute(currentPath);
    const paymentRedirectUrl = getPaymentRedirectUrl();
    
    
    // Redirect authenticated users who need payment setup from protected routes
    // BUT: Don't redirect if user is on trial-success page (they're in payment verification flow)
    // OR if payment was just completed (during transition handoff)
    const paymentJustCompleted = sessionStorage.getItem('payment_just_completed');
    if (isAuthenticated && needsPaymentSetup && isProtected && currentPath !== paymentRedirectUrl && currentPath !== '/trial-success' && !paymentJustCompleted) {
      console.log('🔒 Redirecting user to payment setup (paid:', user?.hasPaid, 'emailVerified:', user?.emailVerified, '):', user.email);
      setLocation(paymentRedirectUrl);
      return;
    }
    
    // Redirect authenticated user from root to appropriate destination
    if (isAuthenticated && currentPath === '/' && !hasStripeSession && !isPaymentReturn && !isTrialSuccess) {
      // Check if we just completed payment and may need a moment for data to sync
      const paymentJustCompleted = sessionStorage.getItem('payment_just_completed');
      if (paymentJustCompleted) {
        console.log('⏳ Payment just completed, clearing flag and checking user data...');
        sessionStorage.removeItem('payment_just_completed');
        
        // CRITICAL: Always redirect to dashboard when payment_just_completed flag is set
        // The flag is only set after successful payment verification
        console.log('✅ Payment verification completed, redirecting to dashboard');
        setLocation('/dashboard');
        return;
      }
      
      if (needsPaymentSetup) {
        console.log('🔄 Redirecting authenticated unpaid user to payment setup');
        setLocation(paymentRedirectUrl);
      } else {
        console.log('🔄 Redirecting authenticated paid user to dashboard');
        setLocation('/dashboard');
      }
      return;
    }

    // This check is now handled earlier in the useEffect
  }, [isAuthenticated, isLoading, user, location, refreshUserData, settings]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show welcome page if settings are incomplete
  if (showWelcomePage && isAuthenticated && user) {
    return (
      <WelcomePage
        user={user}
        onComplete={() => {
          // Mark welcome as dismissed for this session
          sessionStorage.setItem('welcome-dismissed', 'true');
          setShowWelcomePage(false);
        }}
      />
    );
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/verify-email" component={EmailVerification} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/start-trial" component={StartTrial} />
      <Route path="/terms-and-conditions" component={PublicTermsAndConditions} />
      <Route path="/privacy-policy" component={PublicPrivacyPolicy} />
      <Route path="/cookie-policy" component={PublicCookiePolicy} />
      <Route path="/refund-policy" component={PublicRefundPolicy} />
      <Route path="/acceptable-use-policy" component={PublicAcceptableUsePolicy} />
      <Route path="/data-processing-agreement" component={PublicDataProcessingAgreement} />
      <Route path="/disclaimer" component={PublicDisclaimer} />
      <Route path="/cookie-preferences" component={CookiePreferences} />
      <Route path="/trial-success" component={TrialSuccessPage} />
      <Route path="/success" component={SuccessPage} />

      <Route path="/sign-contract/:id" component={SignContract} />
      <Route path="/view-contract/:id" component={ViewContract} />
      <Route path="/view-invoice/:id" component={ViewInvoice} />
      <Route path="/widget/:token" component={QuickAddWidget} />

      <Route path="/logout" component={LogoutPage} />
      <Route path="/subscription/update-payment" component={SubscriptionUpdatePayment} />
      
      {/* Protected routes - require authentication */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/bookings/duplicates" component={DuplicateManager} />
      <Route path="/mobile-bookings" component={lazy(() => import('@/pages/mobile-bookings'))} />
      <Route path="/new-booking" component={NewBooking} />

      <Route path="/address-book" component={AddressBook} />
      <Route path="/mobile-client-lookup" component={lazy(() => import('@/components/mobile-client-lookup'))} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/contracts/new" component={Contracts} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/invoices/new" component={Invoices} />
      <Route path="/invoices/new/bookings/:bookingId" component={Invoices} />
      <Route path="/compliance" component={Compliance} />
      <Route path="/settings" component={Settings} />
      <Route path="/account-settings" component={AccountSettings} />
      <Route path="/templates" component={Templates} />
      <Route path="/messages" component={Messages} />
      <Route path="/email-failures" component={EmailFailures} />
      <Route path="/conversation/:bookingId" component={Conversation} />
      <Route path="/booking-summary/:bookingId" component={BookingSummary} />
      <Route path="/booking/:bookingId/collaborate" component={BookingCollaborate} />
      <Route path="/unparseable-messages" component={UnparseableMessages} />
      <Route path="/system-health" component={SystemHealth} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/beta-checklist" component={BetaChecklist} />
      <Route path="/email-setup" component={EmailSetup} />
      <Route path="/mobile-invoice-sender" component={MobileInvoiceSender} />
      <Route path="/google-calendar-callback" component={GoogleCalendarCallback} />
      {/* <Route path="/maps-test" component={GoogleMapsTest} /> */}

      {/* Internal legal pages for authenticated users - accessible from Settings */}
      <Route path="/legal/terms-and-conditions" component={TermsAndConditions} />
      <Route path="/legal/privacy-policy" component={PrivacyPolicy} />
      <Route path="/legal/cookie-policy" component={CookiePolicy} />
      <Route path="/legal/refund-policy" component={RefundPolicy} />
      <Route path="/legal/acceptable-use-policy" component={AcceptableUsePolicy} />
      <Route path="/legal/data-processing-agreement" component={DataProcessingAgreement} />
      <Route path="/legal/disclaimer" component={Disclaimer} />

      <Route path="/admin" component={Admin} />
      <Route path="/monitoring" component={MonitoringDashboard} />
      <Route path="/promo-metronome" component={PromoMetronomePage} />

      {/* Public Invoice - for clients to view and pay invoices */}
      <Route path="/invoice/:token" component={PublicInvoice} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    // Listen for navigation changes
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    // Listen for both popstate (browser back/forward) and custom navigation
    window.addEventListener('popstate', handleLocationChange);

    // Also check on interval in case React Router doesn't trigger popstate
    const interval = setInterval(() => {
      if (window.location.pathname !== currentPath) {
        setCurrentPath(window.location.pathname);
      }
    }, 100);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, [currentPath]);

  // Don't show MobileNav on collaboration pages
  const shouldShowMobileNav = !currentPath.includes('/collaborate');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <HelpTooltipProvider>
                <AuthProvider>
                  {/* OnboardingWrapper temporarily removed */}
                  <Toaster />
                  <Router />
                  {/* Only render MobileNav if not on client portal or collaboration pages */}
                  {shouldShowMobileNav && <MobileNav />}
                  <CookieConsentBanner />
                </AuthProvider>
              </HelpTooltipProvider>
            </TooltipProvider>
          </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
