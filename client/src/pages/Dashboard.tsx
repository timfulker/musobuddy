import { useQuery } from '@tanstack/react-query';
import { 
  Music, 
  MessageCircle, 
  FileText, 
  Receipt, 
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react';

// API client function
const fetchDashboardData = async () => {
  const [enquiries, contracts, invoices, bookings] = await Promise.all([
    fetch('/api/enquiries').then(res => res.json()),
    fetch('/api/contracts').then(res => res.json()),
    fetch('/api/invoices').then(res => res.json()),
    fetch('/api/bookings').then(res => res.json()),
  ]);
  
  return { enquiries, contracts, invoices, bookings };
};

const Dashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          Error loading dashboard data. Please check your connection and try again.
        </div>
      </div>
    );
  }

  const { enquiries = [], contracts = [], invoices = [], bookings = [] } = data || {};

  // Calculate statistics
  const stats = {
    totalEnquiries: enquiries.length,
    newEnquiries: enquiries.filter((e: any) => e.status === 'new').length,
    totalContracts: contracts.length,
    signedContracts: contracts.filter((c: any) => c.status === 'signed').length,
    totalInvoices: invoices.length,
    paidInvoices: invoices.filter((i: any) => i.status === 'paid').length,
    totalBookings: bookings.length,
    upcomingBookings: bookings.filter((b: any) => 
      new Date(b.eventDate) > new Date() && b.status === 'confirmed'
    ).length,
  };

  const statCards = [
    {
      title: 'New Enquiries',
      value: stats.newEnquiries,
      total: stats.totalEnquiries,
      icon: MessageCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Active Contracts',
      value: stats.signedContracts,
      total: stats.totalContracts,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Paid Invoices',
      value: stats.paidInvoices,
      total: stats.totalInvoices,
      icon: Receipt,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Upcoming Gigs',
      value: stats.upcomingBookings,
      total: stats.totalBookings,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Music className="h-8 w-8 text-primary" />
            Welcome to MusoBuddy
          </h1>
          <p className="text-muted-foreground mt-2">
            Your AI-powered musician admin platform
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-card rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className="flex items-baseline space-x-2">
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      / {stat.total}
                    </p>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Enquiries */}
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Enquiries</h2>
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          {enquiries.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No enquiries yet</p>
              <p className="text-sm text-muted-foreground">
                Your new booking requests will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {enquiries.slice(0, 3).map((enquiry: any) => (
                <div key={enquiry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <p className="font-medium text-foreground">{enquiry.clientName}</p>
                    <p className="text-sm text-muted-foreground">{enquiry.eventType}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium status-${enquiry.status}`}>
                    {enquiry.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Gigs */}
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Upcoming Gigs</h2>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No bookings yet</p>
              <p className="text-sm text-muted-foreground">
                Your confirmed gigs will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings
                .filter((booking: any) => new Date(booking.eventDate) > new Date())
                .slice(0, 3)
                .map((booking: any) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div>
                      <p className="font-medium text-foreground">{booking.clientName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.eventDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium status-${booking.status}`}>
                      {booking.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;