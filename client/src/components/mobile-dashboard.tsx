import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  MessageSquare, 
  Plus, 
  Send, 
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { Link } from 'wouter';
import { format, isToday, isTomorrow, addDays } from 'date-fns';

export default function MobileDashboard() {
  const { data: bookings } = useQuery({
    queryKey: ['/api/bookings'],
    select: (data: any[]) => data || []
  });

  const { data: invoices } = useQuery({
    queryKey: ['/api/invoices'],
    select: (data: any[]) => data || []
  });

  // Calculate stats
  const now = new Date();
  const upcomingBookings = bookings?.filter(b => new Date(b.eventDate) >= now) || [];
  const todayBookings = upcomingBookings.filter(b => isToday(new Date(b.eventDate)));
  const tomorrowBookings = upcomingBookings.filter(b => isTomorrow(new Date(b.eventDate)));
  const thisWeekBookings = upcomingBookings.filter(b => {
    const eventDate = new Date(b.eventDate);
    return eventDate <= addDays(now, 7);
  });

  const unpaidInvoices = invoices?.filter(i => i.status !== 'Paid') || [];
  const pendingBookings = bookings?.filter(b => b.status === 'Pending' || b.status === 'pending') || [];

  // Get next upcoming booking
  const nextBooking = upcomingBookings.sort((a, b) => 
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  )[0];

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const formatEventTime = (timeString: string) => {
    if (!timeString || timeString === 'TBC') return 'Time TBC';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return format(date, 'h:mm a');
    } catch {
      return timeString;
    }
  };

  // Note: Mobile detection is handled by parent dashboard component
  // No need for redirect logic here

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome Back!</h1>
        <p className="text-purple-100">
          {todayBookings.length > 0 ? `You have ${todayBookings.length} gig${todayBookings.length > 1 ? 's' : ''} today` : 
           tomorrowBookings.length > 0 ? `You have ${tomorrowBookings.length} gig${tomorrowBookings.length > 1 ? 's' : ''} tomorrow` :
           'Ready to rock your next gig?'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/mobile-invoice-sender">
          <Card className="hover:shadow-md transition-shadow bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 text-center">
              <Send className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Quick Invoice</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/new-booking">
          <Card className="hover:shadow-md transition-shadow bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="p-4 text-center">
              <Plus className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium text-green-900 dark:text-green-100">Add Booking</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{thisWeekBookings.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{unpaidInvoices.length}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unpaid</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Booking */}
      {nextBooking && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Next Gig</span>
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                {formatEventDate(nextBooking.eventDate)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{nextBooking.clientName}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatEventTime(nextBooking.eventTime)} • {nextBooking.venue || 'Venue TBC'}
              </p>
              {nextBooking.fee && (
                <p className="text-sm text-green-600 font-medium">£{nextBooking.fee}</p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Link href={`/conversation?bookingId=${nextBooking.id}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Message
                </Button>
              </Link>
              <Link href={`/bookings?id=${nextBooking.id}`} className="flex-1">
                <Button size="sm" className="w-full">
                  View Details
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts/Notifications */}
      {pendingBookings.length > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  {pendingBookings.length} Pending Booking{pendingBookings.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Review and confirm your upcoming bookings
                </p>
              </div>
              <Link href="/bookings">
                <Button variant="outline" size="sm" className="text-yellow-700 border-yellow-300">
                  Review
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/messages">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <span className="font-medium">Messages</span>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </div>
          </Link>

          <Link href="/address-book">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-green-500" />
                <span className="font-medium">Clients</span>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </div>
          </Link>

          <Link href="/invoices">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-purple-500" />
                <span className="font-medium">All Invoices</span>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}