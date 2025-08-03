import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
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
  AlertTriangle
} from "lucide-react";
import logoImage from "/musobuddy-logo-purple.png";
import { useResponsive } from "@/hooks/useResponsive";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { isDesktop } = useResponsive();
  // Theme management now handled by ThemeProvider

  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const getNavLinkClass = (path: string) => {
    const baseClass = "flex items-center space-x-3 px-4 py-3 font-medium transition-all duration-200";
    
    return cn(
      baseClass,
      "rounded-lg",
      isActive(path) 
        ? "bg-primary text-white shadow-sm" // Active state: theme color background with white text
        : "text-slate-600 hover:bg-primary/10 hover:text-slate-700" // EXPLICIT: inactive text color with hover
    );
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
          "fixed left-0 top-0 h-full w-64 transition-transform duration-300 ease-in-out flex flex-col",
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
          <div className="flex items-center space-x-3">
            <img 
              src={logoImage} 
              alt="MusoBuddy Logo" 
              className="w-10 h-10 object-contain rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">MusoBuddy</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Less admin, more music</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 pb-20">
          <Link 
            href="/dashboard" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/dashboard")} 
            data-active={isActive("/dashboard").toString()}
            style={{ 
              color: isActive("/dashboard") ? 'white' : '#64748b',
              backgroundColor: isActive("/dashboard") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <Home className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Dashboard</span>
          </Link>
          
          <Link 
            href="/bookings" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/bookings")} 
            data-active={isActive("/bookings").toString()}
            style={{ 
              color: isActive("/bookings") ? 'white' : '#64748b',
              backgroundColor: isActive("/bookings") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <Inbox className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Bookings</span>
          </Link>
          
          <Link 
            href="/address-book" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/address-book")} 
            data-active={isActive("/address-book").toString()}
            style={{ 
              color: isActive("/address-book") ? 'white' : '#64748b',
              backgroundColor: isActive("/address-book") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <Users className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Address Book</span>
          </Link>
          
          <Link 
            href="/contracts" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/contracts")} 
            data-active={isActive("/contracts").toString()}
            style={{ 
              color: isActive("/contracts") ? 'white' : '#64748b',
              backgroundColor: isActive("/contracts") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <FileText className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Contracts</span>
          </Link>
          
          <Link 
            href="/invoices" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/invoices")} 
            data-active={isActive("/invoices").toString()}
            style={{ 
              color: isActive("/invoices") ? 'white' : '#64748b',
              backgroundColor: isActive("/invoices") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <PoundSterling className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Invoices</span>
          </Link>

          <Link 
            href="/compliance" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/compliance")} 
            data-active={isActive("/compliance").toString()}
            style={{ 
              color: isActive("/compliance") ? 'white' : '#64748b',
              backgroundColor: isActive("/compliance") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <Shield className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Compliance</span>
          </Link>
          
          <Link 
            href="/pricing" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/pricing")} 
            data-active={isActive("/pricing").toString()}
            style={{ 
              color: isActive("/pricing") ? 'white' : '#64748b',
              backgroundColor: isActive("/pricing") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <Crown className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Upgrade ⭐</span>
          </Link>
          
          <Link 
            href="/settings" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/settings")} 
            data-active={isActive("/settings").toString()}
            style={{ 
              color: isActive("/settings") ? 'white' : '#64748b',
              backgroundColor: isActive("/settings") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <Settings className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Settings</span>
          </Link>
          
          <Link 
            href="/templates" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/templates")} 
            data-active={isActive("/templates").toString()}
            style={{ 
              color: isActive("/templates") ? 'white' : '#64748b',
              backgroundColor: isActive("/templates") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <MessageSquare className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Templates</span>
          </Link>
          
          <Link 
            href="/unparseable-messages" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/unparseable-messages")} 
            data-active={isActive("/unparseable-messages").toString()}
            style={{ 
              color: isActive("/unparseable-messages") ? 'white' : '#64748b',
              backgroundColor: isActive("/unparseable-messages") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Review Messages</span>
          </Link>
          
          <Link 
            href="/user-guide" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/user-guide")} 
            data-active={isActive("/user-guide").toString()}
            style={{ 
              color: isActive("/user-guide") ? 'white' : '#64748b',
              backgroundColor: isActive("/user-guide") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <BookOpen className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>User Guide</span>
          </Link>
          
          {/* Beta Feedback section - only show for beta testers and admin */}
          {((user as any)?.isBetaTester || (user as any)?.isAdmin) && (
            <Link 
              href="/feedback" 
              onClick={() => window.innerWidth < 768 && onClose()} 
              className={getNavLinkClass("/feedback")} 
              data-active={isActive("/feedback").toString()}
              style={{ 
                color: isActive("/feedback") ? 'white' : '#64748b',
                backgroundColor: isActive("/feedback") ? 'var(--theme-primary)' : 'transparent'
              }}
            >
              <MessageSquare className="w-5 h-5" style={{ color: 'inherit' }} />
              <span style={{ color: 'inherit' }}>Beta Feedback</span>
            </Link>
          )}
          
          {/* Admin section - only show for admin users */}
          {(user as any)?.isAdmin && (
            <Link 
              href="/admin" 
              onClick={() => window.innerWidth < 768 && onClose()} 
              className={getNavLinkClass("/admin")} 
              data-active={isActive("/admin").toString()}
              style={{ 
                color: isActive("/admin") ? 'white' : '#64748b',
                backgroundColor: isActive("/admin") ? 'var(--theme-primary)' : 'transparent'
              }}
            >
              <Crown className="w-5 h-5" style={{ color: 'inherit' }} />
              <span style={{ color: 'inherit' }}>Admin</span>
            </Link>
          )}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
          {/* Theme Toggle Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <ThemeToggle />
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 rounded-lg transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Logout"
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
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Musician</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
