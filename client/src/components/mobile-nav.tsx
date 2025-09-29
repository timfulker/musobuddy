import { Link, useLocation } from "wouter";
import { Home, Inbox, Calendar, PoundSterling, User, BookOpen, Settings, MessageSquare, Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/useResponsive";
import { useNotifications } from "@/hooks/useNotifications";

export default function MobileNav() {
  const [location] = useLocation();
  const { isDesktop } = useResponsive();
  const { counts } = useNotifications();

  // Add CSS class to body to help with hiding mobile nav on client portal
  if (typeof window !== 'undefined') {
    const isClientPortal = location.includes('client-portal') ||
                          window.location.pathname.includes('client-portal') ||
                          window.location.href.includes('client-portal');

    if (isClientPortal) {
      document.body.classList.add('client-portal-page');
    } else {
      document.body.classList.remove('client-portal-page');
    }
  }

  const isActive = (path: string) => {
    return location === path;
  };

  // Don't render on desktop
  if (isDesktop) {
    return null;
  }

  // Don't render on client portal pages - these are for external clients, not authenticated users
  if (location.includes('client-portal') ||
      window.location.pathname.includes('client-portal') ||
      window.location.href.includes('client-portal')) {
    console.log('🚫 MobileNav: Hiding navigation for client portal page');
    return null;
  }

  return (
    <>
      {/* CSS to force hide mobile nav on client portal pages */}
      <style>
        {`
          body.client-portal-page [data-mobile-nav] {
            display: none !important;
          }
        `}
      </style>
      <div
        data-mobile-nav
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-1 py-2 shadow-lg"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          transform: 'translateZ(0)', // Force hardware acceleration
        backfaceVisibility: 'hidden', // Prevent flicker
        willChange: 'transform', // Optimize for animations
        WebkitTransform: 'translateZ(0)', // iOS Safari fix
        WebkitBackfaceVisibility: 'hidden' // iOS Safari fix
      }}
    >
      <div className="flex justify-around">
        {/* Home */}
        <Link href="/" className={cn(
          "flex flex-col items-center space-y-1 py-2 px-2 min-w-0 flex-1 rounded-lg transition-colors",
          isActive("/") ? "text-primary bg-primary/10" : "text-gray-500 dark:text-gray-400 hover:text-primary/80"
        )}>
          <Home className="w-5 h-5" />
          <span className={cn("text-xs leading-tight", isActive("/") && "font-medium")}>Home</span>
        </Link>

        {/* Bookings */}
        <Link href="/bookings" className={cn(
          "flex flex-col items-center space-y-1 py-2 px-2 min-w-0 flex-1 rounded-lg transition-colors relative",
          isActive("/bookings") ? "text-primary bg-primary/10" : "text-gray-500 dark:text-gray-400 hover:text-primary/80"
        )}>
          <div className="relative">
            <Inbox className="w-5 h-5" />
            {counts.totalBookings > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-medium">
                {counts.totalBookings > 9 ? '9+' : counts.totalBookings}
              </span>
            )}
          </div>
          <span className={cn("text-xs leading-tight", isActive("/bookings") && "font-medium")}>Bookings</span>
        </Link>

        {/* Quick Invoice - Mobile-First Feature */}
        <Link href="/mobile-invoice-sender" className={cn(
          "flex flex-col items-center space-y-1 py-2 px-2 min-w-0 flex-1 rounded-lg transition-colors",
          isActive("/mobile-invoice-sender") ? "text-primary bg-primary/10" : "text-gray-500 dark:text-gray-400 hover:text-primary/80"
        )}>
          <Send className="w-5 h-5" />
          <span className={cn("text-xs leading-tight", isActive("/mobile-invoice-sender") && "font-medium")}>Invoice</span>
        </Link>

        {/* Messages */}
        <Link href="/messages" className={cn(
          "flex flex-col items-center space-y-1 py-2 px-2 min-w-0 flex-1 rounded-lg transition-colors relative",
          isActive("/messages") ? "text-primary bg-primary/10" : "text-gray-500 dark:text-gray-400 hover:text-primary/80"
        )}>
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {counts.unreadMessages > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-medium">
                {counts.unreadMessages > 9 ? '9+' : counts.unreadMessages}
              </span>
            )}
          </div>
          <span className={cn("text-xs leading-tight", isActive("/messages") && "font-medium")}>Messages</span>
        </Link>

        {/* Settings */}
        <Link href="/settings" className={cn(
          "flex flex-col items-center space-y-1 py-2 px-2 min-w-0 flex-1 rounded-lg transition-colors",
          isActive("/settings") ? "text-primary bg-primary/10" : "text-gray-500 dark:text-gray-400 hover:text-primary/80"
        )}>
          <Settings className="w-5 h-5" />
          <span className={cn("text-xs leading-tight", isActive("/settings") && "font-medium")}>Settings</span>
        </Link>
      </div>
    </div>
    </>
  );
}
