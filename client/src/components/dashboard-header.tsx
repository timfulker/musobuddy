import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Link } from "wouter";
import NotificationsDropdown from "@/components/notifications-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardHeader() {
  const { user } = useAuthContext();
  const [searchQuery, setSearchQuery] = useState("");

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="bg-white rounded-2xl shadow-soft p-8 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 leading-tight">Your Music Admin, Done Right</h1>
          <p className="text-slate-600 text-lg mt-2">Welcome back, {user?.firstName || 'Musician'} — Let's manage your gigs efficiently</p>
        </div>
        <div className="text-right bg-yellow-50 px-6 py-4 rounded-xl border border-yellow-200">
          <p className="text-sm text-slate-600 font-medium">Today</p>
          <p className="text-xl font-bold text-slate-800">{currentDate}</p>
        </div>
      </div>
    </div>
  );
}
