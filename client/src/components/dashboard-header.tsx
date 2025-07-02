import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Search, Plus } from "lucide-react";

export default function DashboardHeader() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
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
          <button className="relative p-2 text-gray-400 hover:text-gray-600">
            <Bell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>
          
          {/* Quick Actions */}
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            New Enquiry
          </Button>
        </div>
      </div>
    </header>
  );
}
