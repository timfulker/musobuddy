import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar";
import DashboardHeader from "@/components/dashboard-header";
import StatsCards from "@/components/stats-cards";
import ActionableEnquiries from "@/components/kanban-board";
import CalendarWidget from "@/components/calendar-widget";
import QuickActions from "@/components/quick-actions";
import ComplianceAlerts from "@/components/compliance-alerts";
import RecentSignedContracts from "@/components/RecentSignedContracts";
import ConflictsWidget from "@/components/conflicts-widget";
import BookingCTAButtons from "@/components/booking-cta-buttons";
import MobileNav from "@/components/mobile-nav";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useResponsive } from "@/hooks/useResponsive";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Handle Stripe session restoration on dashboard load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSessionId = urlParams.get('stripe_session');
    
    if (stripeSessionId) {
      console.log('🔄 Stripe checkout completed, restoring session:', stripeSessionId);
      
      // Call session restoration API
      apiRequest('/api/auth/restore-session', {
        method: 'POST',
        body: JSON.stringify({ sessionId: stripeSessionId })
      })
      .then(() => {
        console.log('✅ Session restored successfully');
        // Remove the stripe_session parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        // Force page reload to refresh auth state
        window.location.reload();
        toast({
          title: "Welcome to MusoBuddy!",
          description: "Your account is now active. Let's get started with setting up your email integration.",
        });
      })
      .catch((error) => {
        console.error('❌ Session restoration failed:', error);
        toast({
          title: "Authentication Issue",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
      });
    }
  }, [toast, refetch]);

  // Redirect to login if not authenticated (but skip if we're processing Stripe session)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasStripeSession = urlParams.get('stripe_session');
    
    if (!isLoading && !isAuthenticated && !hasStripeSession) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar - Always visible */}
        <div className="w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-700 fixed left-0 top-0 h-full z-30">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 min-h-screen">
          <DashboardHeader />
          
          <main className="p-6 space-y-8 max-w-7xl mx-auto">
            <StatsCards />
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              <div className="xl:col-span-3 space-y-8">
                <ActionableEnquiries />
                <CalendarWidget />
              </div>
              <div className="space-y-6">
                <BookingCTAButtons />
                <QuickActions />
                <ConflictsWidget />
                <ComplianceAlerts />
                <RecentSignedContracts />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu toggle */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="bg-card p-2 rounded-lg shadow-lg"
          >
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`min-h-screen ${isDesktop ? 'ml-64' : ''}`}>
        <DashboardHeader />
        
        <main className="p-3 md:p-6 space-y-3 md:space-y-6">
          <StatsCards />
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 md:gap-6">
            <div className="xl:col-span-3 space-y-3 md:space-y-6">
              <ActionableEnquiries />
              <CalendarWidget />
            </div>
            
            <div className="space-y-3 md:space-y-6">
              <BookingCTAButtons />
              <QuickActions />
              <ConflictsWidget />
              <ComplianceAlerts />
              <RecentSignedContracts />
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
