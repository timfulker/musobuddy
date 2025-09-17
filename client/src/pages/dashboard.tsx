import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import DashboardHeader from "@/components/dashboard-header";
import StatsCards from "@/components/stats-cards";
import ActionableEnquiries from "@/components/kanban-board";
import CalendarWidget from "@/components/calendar-widget";
import QuickActions from "@/components/quick-actions";
import ComplianceAlerts from "@/components/compliance-alerts";
import { ContractNotifications } from "@/components/contract-notifications";
import { MessageNotifications } from "@/components/MessageNotifications";
import ConflictsWidget from "@/components/conflicts-widget";
import BookingCTAButtons from "@/components/booking-cta-buttons";
import MobileNav from "@/components/mobile-nav";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useResponsive } from "@/hooks/useResponsive";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import MobileDashboard from "@/components/mobile-dashboard";
import { notificationSounds } from "@/utils/notificationSounds";
import { NotificationSoundManager } from "@/components/NotificationSoundManager";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDesktop } = useResponsive();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading, refreshUserData } = useAuthContext();
  
  // Prevent infinite loops in preview by detecting preview environment
  const isPreview = window.location.hostname.includes('replit.dev') && 
                    window.location.pathname === '/';

  // Check if we're coming from a payment flow
  useEffect(() => {
    const isFromPayment = document.referrer.includes('/trial-success') || 
                         sessionStorage.getItem('payment_completed') === 'true';
    
    if (isFromPayment && user && !user.hasPaid && !user.has_paid) {
      console.log('🔄 Dashboard: Refreshing user data after payment flow');
      refreshUserData().then(() => {
        console.log('✅ Dashboard: User data refreshed');
        sessionStorage.removeItem('payment_completed');
      });
    }
  }, [user, refreshUserData]);

  // Handle Stripe session restoration on dashboard load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeSessionId = urlParams.get('stripe_session');
    
    if (stripeSessionId) {
      
      
      // Call session restoration API
      apiRequest('/api/auth/restore-session', {
        method: 'POST',
        body: JSON.stringify({ sessionId: stripeSessionId }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(() => {
        
        // Remove the stripe_session parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        toast({
          title: "Welcome to MusoBuddy!",
          description: "Your account is now active. Let's get started with setting up your email integration.",
        });
        console.log('Dashboard initialized with Stripe session');
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
  }, [toast]);

  // Only show toast if auth changes after initial load
  useEffect(() => {
    if (isPreview) return; // Skip auth in preview
    
    const urlParams = new URLSearchParams(window.location.search);
    const hasStripeSession = urlParams.get('stripe_session');
    
    // Don't redirect or show toasts during initial loading or if we have a Stripe session
    if (!isLoading && !isAuthenticated && !hasStripeSession) {
      // Just show a message, let the router handle redirects
      console.log('User not authenticated on dashboard');
    }
  }, [isAuthenticated, isLoading, isPreview]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }
  
  // If not authenticated, show a message (router should handle redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Decorative floating elements */}
        <div className="floating-decoration floating-decoration-1"></div>
        <div className="floating-decoration floating-decoration-2"></div>
        <div className="floating-decoration floating-decoration-3"></div>
        
        <NotificationSoundManager />
        {/* Desktop Sidebar - Always visible */}
        <div className="w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-700 fixed left-0 top-0 h-full z-30">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64 min-h-screen">
          <DashboardHeader />
          
          <main className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            <StatsCards />
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3 space-y-6">
                <ActionableEnquiries />
                <CalendarWidget />
              </div>
              <div className="space-y-4">
                <BookingCTAButtons />
                <ConflictsWidget />
                <QuickActions />
                {user && <MessageNotifications userId={user.id} />}
                <ComplianceAlerts />
                <ContractNotifications />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Mobile users get the optimized mobile dashboard
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Decorative floating elements */}
        <div className="floating-decoration floating-decoration-1"></div>
        <div className="floating-decoration floating-decoration-2"></div>
        <div className="floating-decoration floating-decoration-3"></div>
        
        <NotificationSoundManager />
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="p-4 space-y-6">
          <MobileDashboard />
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative floating elements */}
      <div className="floating-decoration floating-decoration-1"></div>
      <div className="floating-decoration floating-decoration-2"></div>
      <div className="floating-decoration floating-decoration-3"></div>
      
      <NotificationSoundManager />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`min-h-screen ${isDesktop ? 'ml-64' : ''}`}>
        <DashboardHeader />
        
        <main className="p-4 md:p-6 space-y-4 md:space-y-6">
          <StatsCards />
          
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
            <div className="xl:col-span-3 space-y-4 md:space-y-6">
              <ActionableEnquiries />
              <CalendarWidget />
            </div>
            
            <div className="space-y-4">
              <BookingCTAButtons />
              <QuickActions />
              {user && <MessageNotifications userId={user.id} />}
              <ConflictsWidget />
              <ComplianceAlerts />
              <ContractNotifications />
            </div>
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
