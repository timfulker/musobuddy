import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Music, Menu, Settings, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResponsive } from "@/hooks/useResponsive";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "wouter";
import SupportChat from "@/components/support-chat";

export default function MobileHeader() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { isDesktop } = useResponsive();
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Don't render on desktop
  if (isDesktop) {
    return null;
  }

  const getPageTitle = () => {
    switch (location) {
      case '/': return 'Dashboard';
      case '/bookings': return 'Bookings';
      case '/mobile-invoice-sender': return 'Quick Invoice';
      case '/messages': return 'Messages';
      case '/address-book': return 'Clients';
      case '/settings': return 'Settings';
      case '/templates': return 'Templates';
      case '/compliance': return 'Compliance';
      case '/invoices': return 'Invoices';
      case '/user-guide': return 'User Guide';
      default: return 'MusoBuddy';
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
      {/* Logo and Title */}
      <div className="flex items-center space-x-3">
        <Music className="h-7 w-7 text-primary" />
        <div>
          <h1 className="font-semibold text-lg text-gray-900 dark:text-white leading-none">
            {getPageTitle()}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-0.5">
            {user?.displayName || user?.email}
          </p>
        </div>
      </div>

      {/* Menu Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="pb-4 border-b">
              <div className="flex items-center space-x-3">
                <Music className="h-8 w-8 text-primary" />
                <div>
                  <h2 className="font-semibold text-lg">MusoBuddy</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {user?.displayName || user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 px-2 mb-3">NAVIGATION</h3>
              
              <Link href="/settings" onClick={() => setIsOpen(false)}>
                <div className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <Settings className="h-5 w-5" />
                  <span>Settings & Templates</span>
                </div>
              </Link>

              <Link href="/invoices" onClick={() => setIsOpen(false)}>
                <div className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <Settings className="h-5 w-5" />
                  <span>All Invoices</span>
                </div>
              </Link>

              <Link href="/user-guide" onClick={() => setIsOpen(false)}>
                <div className="flex items-center space-x-3 px-3 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <Settings className="h-5 w-5" />
                  <span>User Guide</span>
                </div>
              </Link>
              
            </div>

            {/* Footer */}
            <div className="pt-4 border-t space-y-3">
              <Button 
                onClick={() => {
                  setIsChatOpen(true);
                  setIsOpen(false);
                }} 
                variant="outline" 
                size="sm" 
                className="w-full flex items-center gap-2"
                data-testid="mobile-support-chat-button"
              >
                <MessageCircle className="h-4 w-4" />
                Support Chat
              </Button>
              <Button 
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }} 
                variant="destructive" 
                size="sm" 
                className="w-full"
                data-testid="mobile-logout-button"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Support Chat - controlled by mobile menu button */}
      {isChatOpen && (
        <SupportChat 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
        />
      )}
    </header>
  );
}