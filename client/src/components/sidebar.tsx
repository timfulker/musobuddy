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
  Crown
} from "lucide-react";
import logoImage from "/musobuddy-logo-purple.png";
import { useResponsive } from "@/hooks/useResponsive";

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
          "fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-700 transition-transform duration-300 ease-in-out flex flex-col sidebar-consistent",
          // Always show on desktop (768px+), slide on mobile
          "transform",
          isDesktop ? "translate-x-0 z-30" : (isOpen ? "translate-x-0 z-50" : "-translate-x-full z-50")
        )}
      >
        {/* Close button for mobile */}
        {!isDesktop && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        )}

        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center space-x-3">
            <img 
              src={logoImage} 
              alt="MusoBuddy Logo" 
              className="w-10 h-10 object-contain rounded-lg shadow-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">MusoBuddy</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Less admin, more music</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 pb-20">
          <Link href="/" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
            isActive("/") 
              ? "bg-purple-600 text-white" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/bookings" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/bookings") 
              ? "bg-purple-600 text-white font-medium" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <Inbox className="w-5 h-5" />
            <span>Bookings</span>
          </Link>
          <Link href="/address-book" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/address-book") 
              ? "bg-purple-600 text-white font-medium" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <Users className="w-5 h-5" />
            <span>Address Book</span>
          </Link>
          <Link href="/contracts" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/contracts") 
              ? "bg-purple-600 text-white font-medium" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <FileText className="w-5 h-5" />
            <span>Contracts</span>
          </Link>

          <Link href="/invoices" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/invoices") 
              ? "bg-purple-600 text-white font-medium" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <PoundSterling className="w-5 h-5" />
            <span>Invoices</span>
          </Link>


          <Link href="/compliance" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/compliance") 
              ? "bg-purple-600 text-white font-medium" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <Shield className="w-5 h-5" />
            <span>Compliance</span>
          </Link>
          <Link href="/pricing" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/pricing") 
              ? "bg-purple-600 text-white font-medium" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <Crown className="w-5 h-5" />
            <span>Upgrade ⭐</span>
          </Link>
          <Link href="/settings" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/settings") 
              ? "bg-purple-600 text-white font-medium" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <Link href="/templates" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/templates") 
              ? "bg-purple-600 text-white font-medium" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <MessageSquare className="w-5 h-5" />
            <span>Templates</span>
          </Link>
          <Link href="/user-guide" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/user-guide") 
              ? "bg-purple-600 text-white font-medium" 
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
          )}>
            <BookOpen className="w-5 h-5" />
            <span>User Guide</span>
          </Link>
          {/* Beta Feedback section - only show for beta testers and admin */}
          {(user?.isBetaTester || user?.isAdmin) && (
            <Link href="/feedback" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
              "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
              isActive("/feedback") 
                ? "bg-purple-600 text-white font-medium" 
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
            )}>
              <MessageSquare className="w-5 h-5" />
              <span>Beta Feedback</span>
            </Link>
          )}
          
          {/* Admin section - only show for admin users */}
          {user?.isAdmin && (
            <Link href="/admin" onClick={() => window.innerWidth < 768 && onClose()} className={cn(
              "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
              isActive("/admin") 
                ? "bg-purple-600 text-white font-medium" 
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800"
            )}>
              <Crown className="w-5 h-5" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center space-x-3">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.firstName || user?.email || "User"}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Musician</p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 rounded transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
