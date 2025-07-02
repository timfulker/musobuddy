import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, Filter, ArrowLeft } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { insertBookingSchema, type Booking } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const bookingFormSchema = insertBookingSchema.extend({
  eventDate: z.string(),
});

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Check URL parameters to auto-open dialog
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'block') {
      setIsDialogOpen(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      title: "",
      clientName: "",
      eventDate: "",
      eventTime: "",
      venue: "",
      fee: "",
      contractId: 0,
    },
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["/api/bookings"],
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingFormSchema>) => {
      const bookingData = {
        ...data,
        eventDate: new Date(data.eventDate).toISOString(),
        fee: parseFloat(data.fee) || 0,
        contractId: data.contractId === 0 ? null : data.contractId,
      };
      return apiRequest("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Success",
        description: "Time blocked successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to block time. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
    }
  };

  const onSubmit = (data: z.infer<typeof bookingFormSchema>) => {
    createBookingMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-blue-100 text-blue-800 border-blue-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string) => {
    return timeString || "Time TBC";
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking: Booking) => {
      const bookingDate = new Date(booking.eventDate);
      return bookingDate.toDateString() === date.toDateString();
    });
  };

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600">View and manage your performance schedule</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-white rounded-lg border p-1">
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("month")}
              >
                Month
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>
              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("day")}
              >
                Day
              </Button>
            </div>
            
            <Button 
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Block Time
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance Calendar</CardTitle>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Sync with Google
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                modifiers={{
                  booked: bookings.map((booking: Booking) => new Date(booking.eventDate)),
                }}
                modifiersClassNames={{
                  booked: "bg-purple-100 text-purple-900 font-semibold",
                }}
              />
              
              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
                  <span>Booked dates</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                  <span>Confirmed gigs</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5" />
                <span>
                  {selectedDate ? 
                    selectedDate.toLocaleDateString("en-GB", { month: "short", day: "numeric" }) :
                    "Select Date"
                  }
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDate && (
                <div className="text-sm text-gray-600 mb-4">
                  {formatDate(selectedDate.toISOString())}
                </div>
              )}

              {selectedDateBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No bookings on this date</p>
                  <p className="text-sm">Available for new gigs</p>
                </div>
              ) : (
                selectedDateBookings.map((booking: Booking) => (
                  <div key={booking.id} className={`p-4 rounded-lg border-2 ${getStatusColor(booking.status)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{booking.title}</h4>
                      <Badge className={getStatusColor(booking.status).replace('border-', '').replace('bg-', 'bg-').replace('text-', 'text-')}>
                        {booking.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{booking.clientName}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(booking.eventTime)}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.venue}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 pt-2 border-t">
                        <span className="font-semibold text-green-600">
                          £{Number(booking.fee).toLocaleString()}
                        </span>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Gigs Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Performances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bookings.slice(0, 5).map((booking: Booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-sm font-medium text-purple-600">
                        {new Date(booking.eventDate).toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}
                      </div>
                      <div className="text-lg font-bold">
                        {new Date(booking.eventDate).getDate()}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">{booking.title}</h4>
                      <p className="text-sm text-gray-600">{booking.venue} • {booking.eventTime}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-semibold text-green-600">£{Number(booking.fee).toLocaleString()}</p>
                    <Badge className={getStatusColor(booking.status).replace('border-', '').replace('bg-', 'bg-').replace('text-', 'text-')}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {bookings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg">No upcoming performances</p>
                  <p>Your confirmed bookings will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}