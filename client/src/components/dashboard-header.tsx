import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Link } from "wouter";
import NotificationsDropdown from "@/components/notifications-dropdown";

export default function DashboardHeader() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Add left margin on mobile to make room for hamburger menu */}
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 ml-12 md:ml-0">Dashboard</h2>
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
            <span>Welcome back, <span className="font-medium text-gray-900">{user?.firstName || "User"}</span></span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="hidden md:block relative">
            <Input 
              type="text" 
              placeholder="Search enquiries..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10"
            />
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          </div>
          
          {/* Notifications */}
          <NotificationsDropdown />
          
          {/* Quick Actions */}
          <Link href="/enquiries?action=new">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">New Enquiry</span>
              <span className="sm:hidden">New</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
