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
import QuickAddWidget from "@/pages/quick-add-widget";
import NewBooking from "@/pages/new-booking";
import AddressBook from "@/pages/address-book";
import UserGuide from "@/pages/user-guide";
import Admin from "@/pages/admin";
import Feedback from "@/pages/feedback";
import ClientPortal from "@/pages/client-portal";

import EmailSetup from "@/pages/email-setup";
import UnparseableMessages from "@/pages/unparseable-messages";
import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import StartTrial from "@/pages/start-trial";
import TrialSuccessPage from "@/pages/trial-success";
import TermsAndConditions from "@/pages/terms-and-conditions";
import SupportChat from "@/components/support-chat";
import SystemHealth from "@/pages/system-health";
import MobileInvoiceSender from "@/pages/mobile-invoice-sender";
import GoogleMapsTestPage from "@/pages/GoogleMapsTest";
import { useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading, user, error } = useAuth();

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

  // DEBUG: Log authentication state for root path
  const currentPath = window.location.pathname;
  if (currentPath === '/') {
    console.log('🔍 Root path auth state:', {
      isAuthenticated,
      hasUser: !!user,
      hasError: !!error,
      errorStatus: (error as any)?.status,
      userPhoneVerified: (user as any)?.phoneVerified,
      currentPath
    });
  }

  // Simple redirect without useEffect to prevent loops
  // Exception: Don't redirect if user is on trial-success page or coming from Stripe
  const hasStripeSession = window.location.search.includes('stripe_session');
  
  if (isAuthenticated && currentPath === '/' && !hasStripeSession) {
    console.log('🔄 Redirecting authenticated user to dashboard');
    window.location.href = '/dashboard';
    return null;
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/start-trial" component={StartTrial} />
      <Route path="/terms-and-conditions" component={TermsAndConditions} />
      <Route path="/trial-success" component={TrialSuccessPage} />
      <Route path="/success" component={SuccessPage} />
      <Route path="/sign-contract/:id" component={SignContract} />
      <Route path="/view-contract/:id" component={ViewContract} />
      <Route path="/view-invoice/:id" component={ViewInvoice} />
      <Route path="/widget/:token" component={QuickAddWidget} />

      <Route path="/logout" component={() => {
        // Client-side logout handler - clears cache and redirects
        fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include'
        }).then(() => {
          // Clear React Query cache to force re-authentication
          queryClient.clear();
          window.location.href = '/';
        }).catch(() => {
          // Even if logout fails, clear cache and redirect
          queryClient.clear();
          window.location.href = '/';
        });
        return <div>Logging out...</div>;
      }} />
      
      {/* Protected routes - require authentication */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/bookings" component={Bookings} />
      <Route path="/new-booking" component={NewBooking} />

      <Route path="/address-book" component={AddressBook} />
      <Route path="/contracts" component={Contracts} />
      <Route path="/invoices" component={Invoices} />
      <Route path="/compliance" component={Compliance} />
      <Route path="/settings" component={Settings} />
      <Route path="/templates" component={Templates} />
      <Route path="/unparseable-messages" component={UnparseableMessages} />
      <Route path="/user-guide" component={UserGuide} />
      <Route path="/system-health" component={SystemHealth} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/email-setup" component={EmailSetup} />
      <Route path="/mobile-send" component={MobileInvoiceSender} />
      <Route path="/maps-test" component={GoogleMapsTestPage} />
      <Route path="/admin" component={Admin} />
      
      {/* Client Portal - public route with token */}
      <Route path="/client-portal/:contractId" component={ClientPortal} />
      
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
              <Toaster />
              <Router />
              <SupportChat />
            </TooltipProvider>
          </AppThemeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
