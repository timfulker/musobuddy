import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
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
  X
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
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
        "fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 transition-transform duration-300 ease-in-out",
        "md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 md:hidden"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">MusoBuddy</h1>
              <p className="text-sm text-gray-500">Admin made easy</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          <a href="#" className="flex items-center space-x-3 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg font-medium">
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Inbox className="w-5 h-5" />
            <span>Enquiries</span>
            <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-1 rounded-full">12</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <FileText className="w-5 h-5" />
            <span>Contracts</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <DollarSign className="w-5 h-5" />
            <span>Invoices</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Calendar className="w-5 h-5" />
            <span>Calendar</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Shield className="w-5 h-5" />
            <span>Compliance</span>
          </a>
          <a href="#" className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <BarChart3 className="w-5 h-5" />
            <span>Analytics</span>
          </a>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {user?.profileImageUrl ? (
              <img 
                src={user.profileImageUrl} 
                alt="Profile" 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName || user?.email || "User"}
              </p>
              <p className="text-xs text-gray-500">Musician</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
