import React from "react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { ContractLearningInterface } from "@/components/ContractLearningInterface";

export default function ContractsLearningPage() {
  const { isMobile } = useResponsive();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {!isMobile && <Sidebar />}
      {isMobile && <MobileNav />}
      
      <div className="flex-1 flex flex-col">
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <ContractLearningInterface />
        </main>
      </div>
    </div>
  );
}