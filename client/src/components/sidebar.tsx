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

  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) => {
    return location === path;
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
          "fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out flex flex-col",
          "font-inter shadow-sm",
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
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
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
          <Link href="/dashboard" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/dashboard") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/bookings" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/bookings") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <Inbox className="w-5 h-5" />
            <span>Bookings</span>
          </Link>
          <Link href="/address-book" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/address-book") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <Users className="w-5 h-5" />
            <span>Address Book</span>
          </Link>
          <Link href="/contracts" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/contracts") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <FileText className="w-5 h-5" />
            <span>Contracts</span>
          </Link>

          <Link href="/invoices" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/invoices") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <PoundSterling className="w-5 h-5" />
            <span>Invoices</span>
          </Link>

          <Link href="/compliance" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/compliance") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <Shield className="w-5 h-5" />
            <span>Compliance</span>
          </Link>
          <Link href="/pricing" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/pricing") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <Crown className="w-5 h-5" />
            <span>Upgrade ⭐</span>
          </Link>

          <Link href="/settings" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/settings") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <Link href="/templates" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/templates") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <MessageSquare className="w-5 h-5" />
            <span>Templates</span>
          </Link>
          <Link href="/unparseable-messages" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/unparseable-messages") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <AlertTriangle className="w-5 h-5" />
            <span>Review Messages</span>
          </Link>
          <Link href="/user-guide" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
            isActive("/user-guide") 
              ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
              : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
          )}>
            <BookOpen className="w-5 h-5" />
            <span>User Guide</span>
          </Link>
          {/* Beta Feedback section - only show for beta testers and admin */}
          {(user?.isBetaTester || user?.isAdmin) && (
            <Link href="/feedback" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
              "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
              isActive("/feedback") 
                ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
                : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
            )}>
              <MessageSquare className="w-5 h-5" />
              <span>Beta Feedback</span>
            </Link>
          )}
          
          {/* Admin section - only show for admin users */}
          {user?.isAdmin && (
            <Link href="/admin" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
              "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
              isActive("/admin") 
                ? "bg-basecamp-yellow text-slate-900 shadow-sm" 
                : "text-slate-700 dark:text-slate-300 hover:bg-basecamp-yellow/20 hover:text-slate-900 dark:hover:bg-basecamp-yellow/10 dark:hover:text-slate-200"
            )}>
              <Crown className="w-5 h-5" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          {/* Theme Toggle and Logout Row */}
          <div className="flex items-center justify-between mb-3">
            <ThemeToggle />
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
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
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
                {user?.firstName || user?.email || "User"}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Musician</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
