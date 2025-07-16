import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { PoundSterling, Calendar, FileText, ArrowUp, Clock } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">This Month</p>
              <p className="text-xl md:text-3xl font-bold text-foreground">
                £{stats?.monthlyRevenue?.toLocaleString() || "0"}
              </p>
              <p className="text-xs md:text-sm text-green-600 mt-1 flex items-center">
                <ArrowUp className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                12% vs last month
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <PoundSterling className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Active Bookings</p>
              <p className="text-xl md:text-3xl font-bold text-foreground">
                {stats?.activeBookings || 0}
              </p>
              <p className="text-xs md:text-sm text-blue-600 mt-1 flex items-center">
                <Calendar className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                Confirmed & awaiting signature
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-muted-foreground">Pending Invoices</p>
              <p className="text-xl md:text-3xl font-bold text-foreground">
                £{stats?.pendingInvoices?.toLocaleString() || "0"}
              </p>
              <p className="text-xs md:text-sm text-orange-600 mt-1 flex items-center">
                <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                {stats?.overdueInvoices || 0} overdue
              </p>
            </div>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      

    </div>
  );
}
