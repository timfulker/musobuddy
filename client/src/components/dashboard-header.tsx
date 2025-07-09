import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Link } from "wouter";
import NotificationsDropdown from "@/components/notifications-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardHeader() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="bg-background border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Add left margin on mobile to make room for hamburger menu */}
          <h2 className="text-xl md:text-2xl font-bold text-foreground ml-12 md:ml-0">Dashboard</h2>
          <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Welcome back, <span className="font-medium text-foreground">{user?.firstName || "User"}</span></span>
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
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          </div>
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Notifications */}
          <NotificationsDropdown />
          
          {/* Quick Actions */}
          <Link href="/enquiries?action=new">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
