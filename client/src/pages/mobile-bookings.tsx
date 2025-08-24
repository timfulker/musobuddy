import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Calendar, Filter, Loader2 } from 'lucide-react';
import MobileBookingCard from '@/components/mobile-booking-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'wouter';

export default function MobileBookings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const isMobile = useIsMobile();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['/api/bookings'],
    select: (data: any[]) => data || []
  });

  // Fetch conflicts data for conflict indicators
  const { data: conflicts = [] } = useQuery({
    queryKey: ['/api/conflicts'],
    enabled: !isLoading && bookings && bookings.length > 0,
  });

  // Create a mapping of conflicts by booking ID for quick lookup
  const conflictsByBookingId = useMemo(() => {
    if (!conflicts || conflicts.length === 0) return {};
    
    const conflictMap: { [bookingId: number]: any[] } = {};
    conflicts.forEach((conflict: any) => {
      const { bookingId, withBookingId, clientName, time, severity, message } = conflict;
      
      // Add conflict info for this booking
      if (!conflictMap[bookingId]) conflictMap[bookingId] = [];
      conflictMap[bookingId].push({
        conflictingBookingId: withBookingId,
        clientName,
        time,
        severity,
        message
      });
    });
    
    return conflictMap;
  }, [conflicts]);

  // Filter and sort bookings
  const filteredBookings = bookings?.filter(booking => 
    booking.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.eventType?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const now = new Date();
  const upcomingBookings = filteredBookings
    .filter(booking => new Date(booking.eventDate) >= now)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const pastBookings = filteredBookings
    .filter(booking => new Date(booking.eventDate) < now)
    .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const pendingBookings = filteredBookings
    .filter(booking => booking.status === 'Pending' || booking.status === 'pending')
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

  const getCurrentBookings = () => {
    switch (activeTab) {
      case 'upcoming': return upcomingBookings;
      case 'past': return pastBookings;
      case 'pending': return pendingBookings;
      default: return upcomingBookings;
    }
  };

  const currentBookings = getCurrentBookings();

  if (!isMobile) {
    // Redirect to regular bookings page on desktop
    window.location.href = '/bookings';
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-purple-900 dark:text-purple-100">
              Bookings
            </h1>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Manage your gigs on-the-go
            </p>
          </div>
          <Link href="/new-booking">
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming" className="text-sm">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-sm">
            Pending ({pendingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="text-sm">
            Past ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <BookingsList bookings={upcomingBookings} isLoading={isLoading} emptyMessage="No upcoming bookings" conflictsByBookingId={conflictsByBookingId} />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <BookingsList bookings={pendingBookings} isLoading={isLoading} emptyMessage="No pending bookings" conflictsByBookingId={conflictsByBookingId} />
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          <BookingsList bookings={pastBookings} isLoading={isLoading} emptyMessage="No past bookings" conflictsByBookingId={conflictsByBookingId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface BookingsListProps {
  bookings: any[];
  isLoading: boolean;
  emptyMessage: string;
  conflictsByBookingId: { [bookingId: number]: any[] };
}

function BookingsList({ bookings, isLoading, emptyMessage, conflictsByBookingId }: BookingsListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
        <p className="text-sm text-gray-500">Loading bookings...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const bookingConflicts = conflictsByBookingId[booking.id] || [];
        return (
          <MobileBookingCard 
            key={booking.id} 
            booking={booking} 
            conflicts={bookingConflicts}
          />
        );
      })}
    </div>
  );
}