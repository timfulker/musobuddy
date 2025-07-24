import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import DashboardHeader from "@/components/dashboard-header";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { ProgressTracker } from "@/components/ProgressTracker";

interface UserStats {
  totalBookings: number;
  totalContracts: number;
  totalInvoices: number;
  totalEarnings: number;
  accountAge: number;
}

export default function ProgressPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDesktop } = useResponsive();

  const { data: progressStats, isLoading } = useQuery<UserStats>({
    queryKey: ["/api/progress/stats"],
    refetchInterval: 60000, // Refresh every minute
  });

  if (!isDesktop && sidebarOpen) {
    return <MobileNav currentPage="Progress" />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        currentPage="Progress" 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          title="Progress Tracker"
          showMobileNav={!isDesktop}
        />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Musical Journey Progress</h1>
              <p className="text-gray-600 mt-2">
                Track your achievements and unlock musical milestone badges as you grow your music business.
              </p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading your progress...</p>
                </div>
              </div>
            ) : progressStats ? (
              <ProgressTracker userStats={progressStats} />
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">Unable to load progress data. Please try again later.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}