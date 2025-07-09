import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Inbox, 
  FileText, 
  DollarSign, 
  Calendar, 
  Shield, 
  BarChart3, 
  Music,
  Settings,
  LogOut,
  X,
  MessageSquare,
  Users,
  User
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const handleLogout = () => {
    window.location.href = "/api/logout";
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
      <div className={cn(
        "fixed left-0 top-0 h-full w-64 bg-sidebar-background shadow-xl z-50 transition-transform duration-300 ease-in-out",
        "md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-sidebar-accent md:hidden"
        >
          <X className="w-5 h-5 text-sidebar-foreground" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center">
              <img 
                src="/musobuddy-logo.svg" 
                alt="MusoBuddy Logo" 
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">MusoBuddy</h1>
              <p className="text-sm text-sidebar-foreground/70">Less admin, more music</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <Link href="/" onClick={onClose} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg font-medium transition-colors",
            isActive("/") 
              ? "bg-sidebar-primary text-sidebar-primary-foreground" 
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/enquiries" onClick={onClose} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/enquiries") 
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
            <Inbox className="w-5 h-5" />
            <span>Enquiries</span>
          </Link>
          <Link href="/address-book" onClick={onClose} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/address-book") 
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
            <Users className="w-5 h-5" />
            <span>Address Book</span>
          </Link>
          <Link href="/contracts" onClick={onClose} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/contracts") 
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
            <FileText className="w-5 h-5" />
            <span>Contracts</span>
          </Link>
          <Link href="/invoices" onClick={onClose} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/invoices") 
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
            <DollarSign className="w-5 h-5" />
            <span>Invoices</span>
          </Link>
          <Link href="/calendar" onClick={onClose} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/calendar") 
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
            <Calendar className="w-5 h-5" />
            <span>Calendar</span>
          </Link>
          <Link href="/compliance" onClick={onClose} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/compliance") 
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
            <Shield className="w-5 h-5" />
            <span>Compliance</span>
          </Link>
          <Link href="/settings" onClick={onClose} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/settings") 
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
          <Link href="/templates" onClick={onClose} className={cn(
            "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
            isActive("/templates") 
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}>
            <MessageSquare className="w-5 h-5" />
            <span>Templates</span>
          </Link>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-sidebar-border">
          <div className="flex items-center space-x-3">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 superhuman-gradient rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-sidebar-foreground">
                {user?.firstName || user?.email || "User"}
              </p>
              <p className="text-xs text-sidebar-foreground/70">Musician</p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sidebar-foreground/70 hover:text-sidebar-foreground px-2 py-1 rounded transition-colors"
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
