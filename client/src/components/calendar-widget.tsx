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

  // Filter for upcoming bookings within the next 30 days
  const bookings = allBookings.filter((booking: Booking) => {
    const eventDate = new Date(booking.eventDate);
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    today.setHours(0, 0, 0, 0);
    thirtyDaysFromNow.setHours(0, 0, 0, 0);
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    return eventDate >= today && eventDate <= thirtyDaysFromNow;
  }).slice(0, 10); // Limit to 10 upcoming bookings

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
      case 'new-enquiry': return "bg-amber-50 text-amber-900 border-amber-200";
      case 'awaiting-response': return "bg-orange-50 text-orange-900 border-orange-200";
      case 'client-confirms': return "bg-blue-50 text-blue-900 border-blue-200";
      case 'contract-sent': return "bg-indigo-50 text-indigo-900 border-indigo-200";
      case 'confirmed': return "bg-green-50 text-green-900 border-green-200";
      case 'cancelled': return "bg-red-50 text-red-900 border-red-200";
      case 'completed': return "bg-purple-50 text-purple-900 border-purple-200";
      default: return "bg-gray-50 text-gray-900 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const stage = mapOldStatusToStage(status);
    switch (stage) {
      case 'new-enquiry': return "text-amber-600";
      case 'awaiting-response': return "text-orange-600";
      case 'client-confirms': return "text-blue-600";
      case 'contract-sent': return "text-indigo-600";
      case 'confirmed': return "text-green-600";
      case 'cancelled': return "text-red-600";
      case 'completed': return "text-purple-600";
      default: return "text-gray-600";
    }
  };

  // Get upcoming bookings (no need to combine with enquiries as they're now in the same table)
  const getUpcomingGigs = () => {
    const now = new Date();
    
    // Filter and sort upcoming bookings
    return bookings
      .filter((booking: Booking) => new Date(booking.eventDate) >= now)
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
      .slice(0, 3)
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
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Gigs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {upcomingGigs.map((gig: any) => {
          const dateInfo = formatDate(gig.eventDate);
          return (
            <Link key={gig.id} href={`/bookings?id=${gig.id}`}>
              <div className={`flex items-center space-x-3 p-3 rounded-lg ${getStatusColor(gig.status)} hover:shadow-md transition-shadow cursor-pointer`}>
                <div className="text-center">
                  <div className={`text-xs font-medium ${getStatusBadgeColor(gig.status)}`}>
                    {dateInfo.month}
                  </div>
                  <div className="text-lg font-bold">
                    {dateInfo.day}
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{gig.title}</h4>
                  <p className="text-sm opacity-75">{gig.venue} • {gig.eventTime}</p>
                  <p className="text-xs font-medium mt-1 opacity-90">{getDisplayStatus(gig.status)}</p>
                  <p className={`text-xs ${getStatusBadgeColor(gig.status)}`}>
                    £{gig.fee} • {gig.status === "confirmed" ? "Confirmed" : "Pending"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}

        {upcomingGigs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No upcoming gigs</p>
            <p className="text-sm">New bookings will appear here</p>
          </div>
        )}

        <Link href="/calendar">
          <Button variant="ghost" className="w-full justify-center">
            View Full Calendar <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
