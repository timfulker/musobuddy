import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
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
import ClientPortal from "@/pages/client-portal";

import EmailSetup from "@/pages/email-setup";
import UnparseableMessages from "@/pages/unparseable-messages";
import Messages from "@/pages/messages";
import Conversation from "@/pages/conversation";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import ResetPasswordPage from "@/pages/auth/reset-password";
import { EmailVerification } from "@/pages/auth/email-verification";
import StartTrial from "@/pages/start-trial";
import TrialSuccessPage from "@/pages/trial-success";
import TermsAndConditions from "@/pages/terms-and-conditions";
import SupportChat from "@/components/support-chat";
import SystemHealth from "@/pages/system-health";
import MobileInvoiceSender from "@/pages/mobile-invoice-sender";
import GoogleCalendarCallback from "@/pages/google-calendar-callback";
import OnboardingWrapper from "@/components/onboarding-wrapper";
import BookingSummary from "@/pages/booking-summary";
import BookingCollaborate from "@/pages/booking-collaborate";
import LogoutPage from "@/pages/logout";
import SubscriptionUpdatePayment from "@/pages/subscription-update-payment";
import DuplicateManager from "@/pages/DuplicateManager";

import { useEffect, lazy } from "react";

function Router() {
  const { isAuthenticated, isLoading, user, error, refreshUserData } = useAuth();
  const [location, setLocation] = useLocation();

  // Use useEffect for navigation to prevent render loops
  useEffect(() => {
    // Note: Removed preview environment skip to ensure access control works in Replit
    
    if (isLoading) return; // Skip navigation logic while loading
    
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
    if (isAuthenticated && needsPaymentSetup && isProtected && currentPath !== paymentRedirectUrl) {
      console.log('🔒 Redirecting unpaid user to payment setup:', user.email);
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
        
        // If user data shows they've paid, redirect to dashboard
        if (user?.hasPaid || user?.has_paid) {
          console.log('✅ User data shows payment, redirecting to dashboard');
          setLocation('/dashboard');
          return;
        } else {
          console.log('⚠️ User data not yet updated after payment, triggering refresh...');
          // Trigger a refresh of user data
          refreshUserData().then(() => {
            console.log('🔄 User data refreshed after payment');
          });
          return; // Don't redirect yet, wait for the refresh to complete
        }
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
  }, [isAuthenticated, isLoading, user, location, refreshUserData]);

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

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/auth/forgot-password" component={ForgotPasswordPage} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />
      <Route path="/auth/verify-email" component={EmailVerification} />
      <Route path="/start-trial" component={StartTrial} />
      <Route path="/terms-and-conditions" component={TermsAndConditions} />
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
      <Route path="/templates" component={Templates} />
      <Route path="/messages" component={Messages} />
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

      <Route path="/admin" component={Admin} />
      
      {/* Client Portal - handled by backend HTML route, removed from frontend to prevent conflicts */}
      
      {/* Public Invoice - for clients to view and pay invoices */}
      <Route path="/invoice/:token" component={PublicInvoice} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <OnboardingWrapper>
                <Toaster />
                <Router />
                <SupportChat />
              </OnboardingWrapper>
            </TooltipProvider>
          </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
