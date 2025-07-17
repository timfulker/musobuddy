import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar, 
  Target,
  MapPin,
  Award,
  Activity,
  BarChart3
} from "lucide-react";

interface BusinessIntelligence {
  totalUsers: number;
  totalBookings: number;
  totalContracts: number;
  totalInvoices: number;
  bookingTrend: {
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
  };
  revenueTrend: {
    thisMonth: number;
    lastMonth: number;
    percentChange: number;
  };
  conversionRate: number;
  averageBookingValue: number;
}

interface TopPerformer {
  id: string;
  name: string;
  email: string;
  bookingCount: number;
  totalRevenue: number;
  averageBookingValue: number;
}

interface GeographicData {
  city: string;
  count: number;
}

export default function AdminAnalytics() {
  const { data: businessData, isLoading: biLoading } = useQuery<BusinessIntelligence>({
    queryKey: ['/api/admin/business-intelligence'],
    queryFn: async () => {
      const response = await fetch('/api/admin/business-intelligence', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch business intelligence');
      return response.json();
    },
  });

  const { data: performers, isLoading: performersLoading } = useQuery<TopPerformer[]>({
    queryKey: ['/api/admin/top-performers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/top-performers', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch top performers');
      return response.json();
    },
  });

  const { data: geoData, isLoading: geoLoading } = useQuery<GeographicData[]>({
    queryKey: ['/api/admin/geographic-distribution'],
    queryFn: async () => {
      const response = await fetch('/api/admin/geographic-distribution', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch geographic data');
      return response.json();
    },
  });

  const TrendIndicator = ({ value, isPositive }: { value: number; isPositive: boolean }) => (
    <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      <span className="text-sm font-medium">{Math.abs(value).toFixed(1)}%</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Business Intelligence Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Booking Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {biLoading ? "..." : `${businessData?.conversionRate?.toFixed(1) || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Enquiries to contracts conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Booking Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{biLoading ? "..." : businessData?.averageBookingValue?.toFixed(0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Per booking revenue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {biLoading ? "..." : businessData?.bookingTrend?.thisMonth || 0}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                vs last month
              </p>
              {businessData?.bookingTrend && (
                <TrendIndicator 
                  value={businessData.bookingTrend.percentChange} 
                  isPositive={businessData.bookingTrend.percentChange > 0}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{biLoading ? "..." : businessData?.revenueTrend?.thisMonth?.toFixed(0) || 0}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                vs last month
              </p>
              {businessData?.revenueTrend && (
                <TrendIndicator 
                  value={businessData.revenueTrend.percentChange} 
                  isPositive={businessData.revenueTrend.percentChange > 0}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Top Performers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performersLoading ? (
                <div className="text-center py-4">Loading performers...</div>
              ) : (
                performers?.slice(0, 5).map((performer, index) => (
                  <div key={performer.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          #{index + 1}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">{performer.name}</p>
                        <p className="text-sm text-muted-foreground">{performer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">£{performer.totalRevenue.toFixed(0)}</p>
                      <p className="text-sm text-muted-foreground">
                        {performer.bookingCount} bookings
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5" />
              <span>Geographic Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {geoLoading ? (
                <div className="text-center py-4">Loading geographic data...</div>
              ) : (
                geoData?.map((location, index) => (
                  <div key={location.city} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <span className="font-medium">{location.city}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ 
                            width: `${(location.count / (geoData[0]?.count || 1)) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">
                        {location.count}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>System Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {biLoading ? "..." : businessData?.totalUsers || 0}
              </div>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {biLoading ? "..." : businessData?.totalBookings || 0}
              </div>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {biLoading ? "..." : businessData?.totalContracts || 0}
              </div>
              <p className="text-sm text-muted-foreground">Total Contracts</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {biLoading ? "..." : businessData?.totalInvoices || 0}
              </div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}