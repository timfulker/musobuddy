import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Bookings from "@/pages/bookings";
import Contracts from "@/pages/contracts";
import Invoices from "@/pages/invoices";
import Compliance from "@/pages/compliance";
import Settings from "@/pages/settings";
import Templates from "@/pages/templates";
import SignContract from "@/pages/sign-contract";
import ViewContract from "@/pages/view-contract";
import ViewInvoice from "@/pages/view-invoice";
import QuickAdd from "@/pages/quick-add";
import NewBooking from "@/pages/new-booking";
import AddressBook from "@/pages/address-book";
import UserGuide from "@/pages/user-guide";
import Admin from "@/pages/admin";
import Feedback from "@/pages/feedback";
import Pricing from "@/pages/pricing";
import EmailSetup from "@/pages/email-setup";
import LandingPage from "@/pages/landing";
import SignupPage from "@/pages/signup";
import TrialSuccessPage from "@/pages/trial-success";
import SupportChat from "@/components/support-chat";
import { useEffect } from "react";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

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

  // Simple redirect without useEffect to prevent loops
  if (isAuthenticated && window.location.pathname === '/') {
    window.location.href = '/dashboard';
    return null;
  }

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/" component={LandingPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/trial-success" component={TrialSuccessPage} />
      <Route path="/sign-contract/:id" component={SignContract} />
      <Route path="/view-contract/:id" component={ViewContract} />
      <Route path="/view-invoice/:id" component={ViewInvoice} />
      <Route path="/quick-add" component={QuickAdd} />
      <Route path="/pricing" component={Pricing} />
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
      <Route path="/user-guide" component={UserGuide} />
      <Route path="/feedback" component={Feedback} />
      <Route path="/email-setup" component={EmailSetup} />
      <Route path="/admin" component={Admin} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
            <SupportChat />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
