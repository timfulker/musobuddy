import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { Link, useLocation } from "wouter";
import { getThemeTextColor } from "@/lib/colorUtils";
import { useState, useEffect, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBadge } from "@/components/NotificationBadge";
import { 
  Home, 
  Inbox, 
  FileText, 
  PoundSterling, 
  Calendar, 
  Shield, 
  BarChart3, 
  Music,
  Settings,
  LogOut,
  X,
  MessageSquare,
  Users,
  User,
  BookOpen,
  Crown,
  Mail,
  Lock,
  AlertTriangle,
  Cog,
  CheckCircle2,
  MessageCircle
} from "lucide-react";
import { MusoBuddyLogo } from "@/components/MusoBuddyLogo";
import { useResponsive } from "@/hooks/useResponsive";
import SupportChat from "@/components/support-chat";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthContext();
  const [location, navigate] = useLocation();
  const { isDesktop } = useResponsive();
  const { currentTheme } = useTheme(); // FIXED: Use currentTheme instead of theme
  const { counts } = useNotifications();
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Persist admin status in localStorage to prevent flickering during auth churn
  const [stableIsAdmin, setStableIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem('userIsAdmin') === 'true';
    } catch {
      return false;
    }
  });
  
  const [stableIsBeta, setStableIsBeta] = useState<boolean>(() => {
    try {
      return localStorage.getItem('userIsBeta') === 'true';
    } catch {
      return false;
    }
  });
  
  // Debounce status updates to prevent flickering during rapid auth state changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user?.isAdmin === true) {
        setStableIsAdmin(true);
        localStorage.setItem('userIsAdmin', 'true');
      } else if (user?.isAdmin === false) {
        setStableIsAdmin(false);
        localStorage.setItem('userIsAdmin', 'false');
      }
      
      if ((user as any)?.isBetaTester === true) {
        setStableIsBeta(true);
        localStorage.setItem('userIsBeta', 'true');
      } else if ((user as any)?.isBetaTester === false) {
        setStableIsBeta(false);
        localStorage.setItem('userIsBeta', 'false');
      }
    }, 100); // 100ms debounce to let auth churn settle

    return () => clearTimeout(timeoutId);
  }, [user?.isAdmin, (user as any)?.isBetaTester]);
  
  const handleLogout = () => {
    // Clear stable status on logout
    localStorage.removeItem('userIsAdmin');
    localStorage.removeItem('userIsBeta');
    // Navigate to logout page for proper cleanup and redirect
    navigate('/logout');
  };

  const isActive = (path: string) => {
    return location === path;
  };

  // REMOVED: JavaScript color forcing - let CSS handle it

  // REMOVED: All JavaScript color functions - let CSS handle it

  // FIXED: Simplified navigation link styling without conflicting CSS classes
  const getNavLinkClass = (path: string) => {
    const baseClass = "flex items-center space-x-3 px-4 py-3 font-medium transition-all duration-200 rounded-lg";
    return baseClass; // Remove conditional classes to avoid CSS conflicts
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div 
        className={cn(
          "fixed left-0 top-0 h-full w-64 transition-transform duration-300 ease-in-out flex flex-col sidebar",
          "shadow-sm font-sans",
          "bg-gray-50 dark:bg-slate-900 border-r border-gray-300 dark:border-slate-700",
          // Always show on desktop (768px+), slide on mobile
          "transform",
          isDesktop ? "translate-x-0 z-30" : (isOpen ? "translate-x-0 z-50" : "-translate-x-full z-50")
        )}
      >
        {/* Close button for mobile */}
        {!isDesktop && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
          >
            <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>
        )}

        {/* Header */}
        <div className="p-6 border-b border-gray-300 dark:border-slate-700">
          <MusoBuddyLogo size="small" showTagline={true} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" style={{ paddingBottom: '160px', maxHeight: 'calc(100vh - 180px)' }}>
          <Link 
            href="/dashboard" 
            onClick={() => window.innerWidth < 768 && onClose()}
            className={cn(
              getNavLinkClass("/dashboard"),
              isActive("/dashboard") ? 'bg-primary text-primary-foreground' : '',
              'relative'
            )}
          >
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
            <NotificationBadge count={counts.newBookings} />
          </Link>
          
          <Link 
            href="/bookings" 
            onClick={() => window.innerWidth < 768 && onClose()}
            className={cn(
              getNavLinkClass("/bookings"),
              isActive("/bookings") ? 'bg-primary text-primary-foreground' : '',
              'relative'
            )}
          >
            <Inbox className="w-5 h-5" />
            <span>Bookings</span>
            <NotificationBadge count={counts.newBookings} />
          </Link>
          
          <Link 
            href="/messages" 
            onClick={() => window.innerWidth < 768 && onClose()}
            className={cn(
              getNavLinkClass("/messages"),
              isActive("/messages") ? 'bg-primary text-primary-foreground' : '',
              'relative'
            )}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Messages</span>
            <NotificationBadge count={counts.totalMessages || counts.clientMessages || 0} />
          </Link>
          
          <Link 
            href="/address-book" 
            onClick={() => window.innerWidth < 768 && onClose()}
            className={cn(
              getNavLinkClass("/address-book"),
              isActive("/address-book") ? 'bg-primary text-primary-foreground' : ''
            )}
          >
            <Users className="w-5 h-5" />
            <span>Address Book</span>
          </Link>
          
          <Link 
            href="/contracts" 
            onClick={() => window.innerWidth < 768 && onClose()}
            className={cn(
              getNavLinkClass("/contracts"),
              isActive("/contracts") ? 'bg-primary text-primary-foreground' : ''
            )}
          >
            <FileText className="w-5 h-5" />
            <span>Contracts</span>
          </Link>
          
          <Link 
            href="/invoices" 
            onClick={() => window.innerWidth < 768 && onClose()}
            className={cn(
              getNavLinkClass("/invoices"),
              isActive("/invoices") ? 'bg-primary text-primary-foreground' : '',
              'relative'
            )}
          >
            <PoundSterling className="w-5 h-5" />
            <span>Invoices</span>
            <NotificationBadge count={counts.overdueInvoices} />
          </Link>

          {/* Admin Panel - always render but hide for non-admin to prevent layout shift */}
          <Link 
            href="/admin" 
            onClick={() => window.innerWidth < 768 && onClose()}
            className={cn(
              getNavLinkClass("/admin"),
              isActive("/admin") ? 'bg-primary text-primary-foreground' : '',
              'relative'
            )}
            style={{ display: stableIsAdmin ? 'flex' : 'none' }}
          >
            <Crown className="w-5 h-5 text-yellow-500" />
            <span>Admin Panel</span>
          </Link>

          
          <Link 
            href="/settings" 
            onClick={() => window.innerWidth < 768 && onClose()}
            className={cn(
              getNavLinkClass("/settings"),
              isActive("/settings") ? 'bg-primary text-primary-foreground' : ''
            )}
          >
            <Cog className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          
          <Link 
            href="/account-settings" 
            onClick={() => window.innerWidth < 768 && onClose()}
            className={cn(
              getNavLinkClass("/account-settings"),
              isActive("/account-settings") ? 'bg-primary text-primary-foreground' : ''
            )}
          >
            <User className="w-5 h-5" />
            <span>Account</span>
          </Link>
          

          
          {/* Beta Testing section - always render but hide for non-beta users to prevent layout shift */}
          <Link 
            href="/beta-checklist" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/beta-checklist")}
            style={{ 
              color: isActive("/beta-checklist") ? getThemeTextColor(currentTheme) : 'var(--theme-text)',
              backgroundColor: isActive("/beta-checklist") ? 'var(--theme-primary)' : 'transparent',
              display: stableIsBeta ? 'flex' : 'none'
            }}
          >
            <CheckCircle2 className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Beta Checklist</span>
          </Link>
          
          <Link 
            href="/feedback" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/feedback")}
            style={{ 
              color: isActive("/feedback") ? getThemeTextColor(currentTheme) : 'var(--theme-text)',
              backgroundColor: isActive("/feedback") ? 'var(--theme-primary)' : 'transparent',
              display: (stableIsBeta || stableIsAdmin) ? 'flex' : 'none'
            }}
          >
            <MessageSquare className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Beta Feedback</span>
          </Link>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 z-10">
          {/* Chat and Logout Row */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => setIsChatOpen(true)}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg transition-all duration-200 hover:bg-slate-100"
              title="Support Chat"
              data-testid="sidebar-support-chat-button"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Support</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg transition-all duration-200 hover:bg-slate-100"
              title="Logout"
              data-testid="sidebar-logout-button"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
          
          {/* User Info */}
          <div className="flex items-center space-x-3">
            {(user as any)?.profileImageUrl ? (
              <img 
                src={(user as any).profileImageUrl} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 bg-slate-600 dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {(user as any)?.firstName || (user as any)?.email || "User"}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {(user as any)?.email || "No email"}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Support Chat - controlled by sidebar button */}
      {isChatOpen && (
        <SupportChat 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}
    </>
  );
}