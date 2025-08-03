import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
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
import { MusoBuddyLogo } from "@/components/MusoBuddyLogo";
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
  const { currentTheme } = useTheme(); // FIXED: Use currentTheme instead of theme
  
  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  // Apply theme-aware navigation styles only on theme/location change
  useEffect(() => {
    const forceNavigationColors = () => {
      // Get all navigation links in sidebar
      const navLinks = document.querySelectorAll('.sidebar nav a');
      
      navLinks.forEach((link) => {
        const linkElement = link as HTMLElement;
        const href = linkElement.getAttribute('href');
        const isCurrentlyActive = href === location;
        
        // Determine text color based on theme and active state
        const shouldUseWhiteText = isCurrentlyActive && 
          (currentTheme === 'purple' || currentTheme === 'midnight-blue');
        
        const textColor = shouldUseWhiteText ? 'white' : '#1e293b';
        
        // Force color on the link itself with !important
        linkElement.style.setProperty('color', textColor, 'important');
        
        // Force color on all child elements
        const children = linkElement.querySelectorAll('*');
        children.forEach((child) => {
          (child as HTMLElement).style.setProperty('color', textColor, 'important');
        });
        
        // Set background color if active
        if (isCurrentlyActive) {
          linkElement.style.setProperty('background-color', 'var(--theme-primary)', 'important');
        } else {
          linkElement.style.setProperty('background-color', 'transparent', 'important');
        }
      });
    };
    
    // Run only once when theme or location changes
    forceNavigationColors();
  }, [currentTheme, location]);

  // Helper function to get navigation link props with forced styling
  const getNavLinkProps = (path: string) => {
    const isLinkActive = isActive(path);
    const textColor = isLinkActive ? getActiveTextColor() : '#1e293b';
    
    // Create a style object that forces the color through multiple properties
    const forcedStyle = {
      color: textColor,
      backgroundColor: isLinkActive ? 'var(--theme-primary)' : 'transparent',
      // Additional properties to force color override
      textDecoration: 'none',
      transition: 'all 0.2s ease'
    };
    
    return {
      className: `${getNavLinkClass(path)} nav-link-forced`,
      'data-active': isLinkActive,
      'data-theme': currentTheme,
      'data-force-color': textColor,
      style: forcedStyle
    };
  };

  // Get theme-appropriate text color for active navigation items
  const getActiveTextColor = () => {
    const needsWhiteText = (currentTheme === 'purple' || currentTheme === 'midnight-blue');
    return needsWhiteText ? 'white' : '#1e293b';
  };

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
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 pb-20">
          <Link 
            href="/dashboard" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            {...getNavLinkProps("/dashboard")}
          >
            <Home 
              className="w-5 h-5" 
              style={{ 
                color: isActive("/dashboard") ? getActiveTextColor() : '#1e293b'
              }} 
            />
            <span 
              style={{ 
                color: isActive("/dashboard") ? getActiveTextColor() : '#1e293b'
              }}
            >
              Dashboard
            </span>
          </Link>
          
          <Link 
            href="/bookings" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            {...getNavLinkProps("/bookings")}
          >
            <Inbox 
              className="w-5 h-5" 
              style={{ 
                color: isActive("/bookings") ? getActiveTextColor() : '#1e293b'
              }} 
            />
            <span 
              style={{ 
                color: isActive("/bookings") ? getActiveTextColor() : '#1e293b'
              }}
            >
              Bookings
            </span>
          </Link>
          
          <Link 
            href="/address-book" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/address-book")}
            style={{ 
              color: isActive("/address-book") ? getActiveTextColor() : '#1e293b',
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
            style={{ 
              color: isActive("/contracts") ? getActiveTextColor() : '#1e293b',
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
            style={{ 
              color: isActive("/invoices") ? getActiveTextColor() : '#1e293b',
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
            style={{ 
              color: isActive("/compliance") ? getActiveTextColor() : '#1e293b',
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
            style={{ 
              color: isActive("/pricing") ? getActiveTextColor() : '#1e293b',
              backgroundColor: isActive("/pricing") ? 'var(--theme-primary)' : 'transparent'
            }}
          >
            <Crown className="w-5 h-5" style={{ color: 'inherit' }} />
            <span style={{ color: 'inherit' }}>Upgrade ⭐</span>
          </Link>
          
          <Link 
            href="/settings" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            {...getNavLinkProps("/settings")}
          >
            <Settings 
              className="w-5 h-5" 
              style={{ 
                color: isActive("/settings") ? getActiveTextColor() : '#1e293b'
              }} 
            />
            <span 
              style={{ 
                color: isActive("/settings") ? getActiveTextColor() : '#1e293b'
              }}
            >
              Settings
            </span>
          </Link>
          
          <Link 
            href="/templates" 
            onClick={() => window.innerWidth < 768 && onClose()} 
            className={getNavLinkClass("/templates")}
            style={{ 
              color: isActive("/templates") ? getActiveTextColor() : '#1e293b',
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
            style={{ 
              color: isActive("/unparseable-messages") ? getActiveTextColor() : '#1e293b',
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
            style={{ 
              color: isActive("/user-guide") ? getActiveTextColor() : '#1e293b',
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
              style={{ 
                color: isActive("/feedback") ? getActiveTextColor() : '#1e293b',
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
              style={{ 
                color: isActive("/admin") ? getActiveTextColor() : '#1e293b',
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