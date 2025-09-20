import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { PoundSterling, Calendar, FileText, ArrowUp, Clock, AlertCircle, MessageCircle, Bell } from "lucide-react";

interface DashboardStats {
  monthlyRevenue?: number;
  activeBookings?: number;
  pendingInvoices?: number;
  overdueInvoices?: number;
  enquiriesRequiringResponse?: number;
  totalMessages?: number;
  unreadMessages?: number;
}

export default function StatsCards() {
  // Disable polling in preview environment
  const isPreview = window.location.hostname.includes('replit.dev');
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: isPreview ? false : 60000, // Disable in preview
    staleTime: 30000,
    enabled: !isPreview, // Disable query in preview
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-green-700/80">This Month</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-900">
                £{stats?.monthlyRevenue?.toLocaleString() || "0"}
              </p>
              <p className="text-xs md:text-sm text-green-600 mt-1 flex items-center">
                <ArrowUp className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                12% vs last month
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <PoundSterling className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-blue-700/80">Active Bookings</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-900">
                {stats?.activeBookings || 0}
              </p>
              <p className="text-xs md:text-sm text-blue-600 mt-1 flex items-center">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Confirmed & awaiting signature
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-orange-700/80">Pending Invoices</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-orange-900">
                £{stats?.pendingInvoices?.toLocaleString() || "0"}
              </p>
              <p className="text-xs md:text-sm text-orange-600 mt-1 flex items-center">
                <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {stats?.overdueInvoices || 0} overdue
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <FileText className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-red-700/80">Enquiries Requiring Response</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-900">
                {stats?.enquiriesRequiringResponse || 0}
              </p>
              <p className="text-xs md:text-sm text-red-600 mt-1 flex items-center">
                <AlertCircle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Need immediate attention
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-purple-700/80">Messages Received</p>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-900">
                {stats?.totalMessages || 0}
              </p>
              <p className="text-xs md:text-sm text-purple-600 mt-1 flex items-center">
                <Bell className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {stats?.unreadMessages || 0} unread
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
