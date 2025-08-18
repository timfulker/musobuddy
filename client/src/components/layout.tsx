import { useState } from "react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import MobileHeader from "@/components/mobile-header";
import { useResponsive } from "@/hooks/useResponsive";
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
      
      {/* Mobile header - using dedicated component */}
      <MobileHeader />

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
        <div className="fixed bottom-6 right-6 z-40">
          <QuickFeedback buttonText="Feedback" buttonVariant="default" />
        </div>
      )}

      <MobileNav />
    </div>
  );
}