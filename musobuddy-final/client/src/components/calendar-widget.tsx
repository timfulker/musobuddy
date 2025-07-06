import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import type { Booking } from "@shared/schema";

export default function CalendarWidget() {
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings/upcoming"],
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
      day: date.getDate().toString(),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-50 text-green-900";
      case "pending": return "bg-blue-50 text-blue-900";
      default: return "bg-gray-50 text-gray-900";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "confirmed": return "text-green-600";
      case "pending": return "text-blue-600";
      default: return "text-gray-600";
    }
  };

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
        {bookings.slice(0, 3).map((booking: Booking) => {
          const dateInfo = formatDate(booking.eventDate);
          return (
            <div key={booking.id} className={`flex items-center space-x-3 p-3 rounded-lg ${getStatusColor(booking.status)}`}>
              <div className="text-center">
                <div className={`text-xs font-medium ${getStatusBadgeColor(booking.status)}`}>
                  {dateInfo.month}
                </div>
                <div className="text-lg font-bold">
                  {dateInfo.day}
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{booking.title}</h4>
                <p className="text-sm opacity-75">{booking.venue} • {booking.eventTime}</p>
                <p className={`text-xs ${getStatusBadgeColor(booking.status)}`}>
                  £{booking.fee} • {booking.status === "confirmed" ? "Confirmed" : "Pending"}
                </p>
              </div>
            </div>
          );
        })}

        {bookings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No upcoming gigs</p>
            <p className="text-sm">New bookings will appear here</p>
          </div>
        )}

        <Button variant="ghost" className="w-full justify-center">
          View Full Calendar <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
