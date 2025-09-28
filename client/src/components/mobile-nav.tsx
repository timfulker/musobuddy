import { Link, useLocation } from "wouter";
import { Home, Inbox, Calendar, PoundSterling, User, BookOpen, Settings, MessageSquare, Send, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/useResponsive";
import { useNotifications } from "@/hooks/useNotifications";

export default function MobileNav() {
  const [location] = useLocation();
  const { isDesktop } = useResponsive();
  const { counts } = useNotifications();

  // IMMEDIATE BAILOUT - Check URL before any other logic
  const isClientPortalPage = () => {
    if (typeof window === 'undefined') return false;
    
    // Check both wouter location and actual browser URL
    const currentPath = window.location.pathname;
    const routerPath = location;
    
    const clientPaths = [
      '/client-portal',
      '/sign-contract',
      '/view-contract',
      '/invoice/',
      '/widget/'
    ];
    
    return clientPaths.some(path => 
      currentPath.includes(path) || routerPath.includes(path)
    );
  };

  // Don't render at all if on client portal or desktop
  if (isDesktop || isClientPortalPage()) {
    return null;
  }

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div
      data-mobile-nav
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-1 py-2 shadow-lg z-50"
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
  );
}