import { useState } from "react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import QuickFeedback from "./quick-feedback";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDesktop } = useResponsive();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Mobile header */}
      {!isDesktop && (
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 z-40">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="p-2"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              MusoBuddy
            </h1>
            <QuickFeedback buttonText="Feedback" buttonSize="sm" />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isDesktop ? "ml-64" : "ml-0",
        !isDesktop && "pt-16 pb-20" // Account for mobile header and nav
      )}>
        <div className="p-6">
          {children}
        </div>
      </div>

      {/* Desktop quick feedback button */}
      {isDesktop && (
        <div className="fixed bottom-6 right-6 z-50">
          <QuickFeedback buttonText="Feedback" buttonVariant="default" />
        </div>
      )}

      <MobileNav />
    </div>
  );
}