import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Booking } from "@shared/schema";
import { getDisplayStatus, mapOldStatusToStage } from "@/utils/workflow-system";

export default function CalendarWidget() {
  const { data: allBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  // Filter for upcoming bookings within the next two weeks (no limit for dynamic sizing)
  const bookings = (allBookings as any[]).filter((booking: Booking) => {
    if (!booking.eventDate) return false;
    const eventDate = new Date(booking.eventDate);
    const today = new Date();
    const twoWeeksFromNow = new Date();
    today.setHours(0, 0, 0, 0);
    twoWeeksFromNow.setHours(0, 0, 0, 0);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    return eventDate >= today && eventDate <= twoWeeksFromNow;
  }); // No limit - dynamic sizing

  const isLoading = bookingsLoading;

  const formatDate = (dateString: string) => {
    // Parse the date string as a local date to avoid timezone shifts
    const date = new Date(dateString);
    // If the date string is in ISO format (YYYY-MM-DD), parse it manually to avoid timezone issues
    if (dateString.includes('T') || dateString.includes('Z')) {
      // It's an ISO timestamp, extract just the date part
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const localDate = new Date(year, month - 1, day); // month is 0-indexed
      return {
        month: localDate.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
        day: localDate.getDate().toString(),
      };
    }
    
    // For regular date strings, use normal parsing
    return {
      month: date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
      day: date.getDate().toString(),
    };
  };

  const getStatusColor = (status: string) => {
    const stage = mapOldStatusToStage(status);
    switch (stage) {
      case 'new': return "bg-amber-50 text-amber-900 border-amber-200";
      case 'in_progress': return "bg-orange-50 text-orange-900 border-orange-200"; 
      case 'client_confirms': return "bg-blue-50 text-blue-900 border-blue-200";
      case 'confirmed': return "bg-green-50 text-green-900 border-green-200";
      case 'rejected': return "bg-red-50 text-red-900 border-red-200";
      case 'completed': return "bg-purple-50 text-purple-900 border-purple-200";
      default: return "bg-gray-50 text-gray-900 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const stage = mapOldStatusToStage(status);
    switch (stage) {
      case 'new': return "text-amber-600";
      case 'in_progress': return "text-orange-600";
      case 'client_confirms': return "text-blue-600";
      case 'confirmed': return "text-green-600";
      case 'rejected': return "text-red-600";
      case 'completed': return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  // Get upcoming bookings (no need to combine with enquiries as they're now in the same table)
  const getUpcomingGigs = () => {
    const now = new Date();
    
    // Filter and sort upcoming bookings (no limit for dynamic sizing)
    return bookings
      .filter((booking: Booking) => booking.eventDate && new Date(booking.eventDate) >= now)
      .sort((a: any, b: any) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .map((booking: Booking) => ({
        id: booking.id,
        title: booking.title,
        clientName: booking.clientName,
        eventDate: booking.eventDate,
        eventTime: booking.eventTime,
        venue: booking.venue,
        fee: booking.fee,
        status: booking.status,
        type: 'booking'
      }));
  };

  const upcomingGigs = getUpcomingGigs();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Gigs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold">Upcoming Gigs</CardTitle>
          <Link href="/bookings">
            <Button variant="outline" size="sm" className="h-9">
              <ArrowRight className="w-4 h-4 mr-2" />
              View Calendar
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Single column layout with wider, enlarged cards */}
        <div className="space-y-4">
          {upcomingGigs.map((gig: any) => {
            const dateInfo = formatDate(gig.eventDate);
            return (
              <Link key={gig.id} href={`/bookings?id=${gig.id}`}>
                <div className={`flex items-center gap-3 p-4 sm:p-6 rounded-lg ${getStatusColor(gig.status)} hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-current`}>
                  {/* Responsive date box */}
                  <div className="text-center flex-shrink-0 w-16 sm:w-20">
                    <div className={`text-xs sm:text-sm font-semibold ${getStatusBadgeColor(gig.status)} uppercase tracking-wide`}>
                      {dateInfo.month}
                    </div>
                    <div className="text-xl sm:text-3xl font-bold text-gray-900">
                      {dateInfo.day}
                    </div>
                  </div>
                  
                  {/* Content with proper overflow handling */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{gig.title}</h4>
                    <p className="text-sm sm:text-base text-gray-700 mt-1 truncate">{gig.venue}</p>
                    {gig.eventTime && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">Time: {gig.eventTime}</p>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                      <span className={`text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full bg-white/50 ${getStatusBadgeColor(gig.status)}`}>
                        {getDisplayStatus(gig.status)}
                      </span>
                      {gig.fee && (
                        <span className="text-xs sm:text-sm font-semibold text-gray-900">
                          £{gig.fee}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {upcomingGigs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No upcoming gigs</p>
            <p className="text-base mt-2">New bookings will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
