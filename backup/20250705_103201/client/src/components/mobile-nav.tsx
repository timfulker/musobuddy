import { Link, useLocation } from "wouter";
import { Home, Inbox, Calendar, DollarSign, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
      <div className="flex justify-around">
        <Link href="/" className={cn(
          "flex flex-col items-center space-y-1 py-2",
          isActive("/") ? "text-purple-600" : "text-gray-400"
        )}>
          <Home className="w-6 h-6" />
          <span className={cn("text-xs", isActive("/") && "font-medium")}>Dashboard</span>
        </Link>
        <Link href="/enquiries" className={cn(
          "flex flex-col items-center space-y-1 py-2",
          isActive("/enquiries") ? "text-purple-600" : "text-gray-400"
        )}>
          <Inbox className="w-6 h-6" />
          <span className={cn("text-xs", isActive("/enquiries") && "font-medium")}>Enquiries</span>
        </Link>
        <Link href="/calendar" className={cn(
          "flex flex-col items-center space-y-1 py-2",
          isActive("/calendar") ? "text-purple-600" : "text-gray-400"
        )}>
          <Calendar className="w-6 h-6" />
          <span className={cn("text-xs", isActive("/calendar") && "font-medium")}>Calendar</span>
        </Link>
        <Link href="/invoices" className={cn(
          "flex flex-col items-center space-y-1 py-2",
          isActive("/invoices") ? "text-purple-600" : "text-gray-400"
        )}>
          <DollarSign className="w-6 h-6" />
          <span className={cn("text-xs", isActive("/invoices") && "font-medium")}>Invoices</span>
        </Link>
        <Link href="/compliance" className={cn(
          "flex flex-col items-center space-y-1 py-2",
          isActive("/compliance") ? "text-purple-600" : "text-gray-400"
        )}>
          <User className="w-6 h-6" />
          <span className={cn("text-xs", isActive("/compliance") && "font-medium")}>Profile</span>
        </Link>
      </div>
    </div>
  );
}
