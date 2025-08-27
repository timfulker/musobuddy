import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeProvider as AppThemeProvider } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
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
import UserGuide from "@/pages/user-guide";
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

import { useEffect, lazy } from "react";

function Router() {
  const { isAuthenticated, isLoading, user, error } = useAuth();
  const [location, setLocation] = useLocation();

  // Use useEffect for navigation to prevent render loops
  useEffect(() => {
    // Skip redirects in preview environment
    const isPreview = window.location.hostname.includes('replit.dev');
    if (isPreview) return;
    
    if (isLoading || !user) return; // Skip navigation logic while loading or user not available
    
    const currentPath = location;
    const hasStripeSession = window.location.search.includes('stripe_session');
    const isPaymentReturn = window.location.search.includes('session_id') || currentPath === '/payment-success';
    const isTrialSuccess = currentPath === '/trial-success';
    
    // Admin bypass emails
    const allowedBypassEmails = ['timfulker@gmail.com', 'timfulkermusic@gmail.com', 'jake.stanley@musobuddy.com'];
    const isAdminUser = user.isAdmin || allowedBypassEmails.includes(user.email);
    
    // Check if user needs payment setup (excluding admin users)
    // STRICT PAYMENT ENFORCEMENT: Multiple checks to prevent bypass
    const needsPaymentSetup = !isAdminUser && (
      user.tier === 'pending_payment' ||  // Explicitly needs payment
      !user.tier ||                       // No tier = blocked
      user.tier === undefined ||          // Undefined tier = blocked  
      (!user.createdViaStripe && !user.created_via_stripe) || // Not created via Stripe = blocked
      user.tier === 'free'                // 'free' tier without admin = blocked (backwards logic fix)
    );
    
    // Debug logging for payment validation
    if (user && !isAdminUser) {
      console.log('💳 Payment validation check:', {
        email: user.email,
        hasCompletedPayment: user.hasCompletedPayment,
        createdViaStripe: user.createdViaStripe,
        tier: user.tier,
        plan: user.plan,
        needsPaymentSetup
      });
    }
    
    // Protected routes that require payment
    const protectedRoutes = ['/dashboard', '/bookings', '/new-booking', '/contracts', '/invoices', '/settings', '/compliance', '/templates', '/address-book', '/admin', '/feedback', '/unparseable-messages', '/messages', '/conversation', '/email-setup', '/system-health', '/mobile-invoice-sender'];
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
    
    // Redirect authenticated users who need payment setup from protected routes
    if (isAuthenticated && needsPaymentSetup && isProtectedRoute && currentPath !== '/subscription/update-payment') {
      console.log('🔒 Redirecting unpaid user to payment setup:', user.email);
      setLocation('/subscription/update-payment');
      return;
    }
    
    // Redirect authenticated user from root to appropriate destination
    if (isAuthenticated && currentPath === '/' && !hasStripeSession && !isPaymentReturn && !isTrialSuccess) {
      if (needsPaymentSetup) {
        console.log('🔄 Redirecting authenticated unpaid user to payment setup');
        setLocation('/subscription/update-payment');
      } else {
        console.log('🔄 Redirecting authenticated paid user to dashboard');
        setLocation('/dashboard');
      }
      return;
    }

    // Redirect unauthenticated users from protected routes to login
    if (!isAuthenticated && isProtectedRoute) {
      console.log('🔒 Redirecting unauthenticated user to login');
      setLocation('/login');
      return;
    }
  }, [isAuthenticated, isLoading, user, location]);

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
      <Route path="/user-guide" component={UserGuide} />
      <Route path="/system-health" component={SystemHealth} />
      <Route path="/feedback" component={Feedback} />
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
        <ThemeProvider defaultTheme="light">
          <AppThemeProvider>
            <TooltipProvider>
              <OnboardingWrapper>
                <Toaster />
                <Router />
                <SupportChat />
              </OnboardingWrapper>
            </TooltipProvider>
          </AppThemeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
