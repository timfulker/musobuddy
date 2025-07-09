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
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, Filter, ArrowLeft, Download, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { insertBookingSchema, type Booking } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import CalendarImport from "@/components/calendar-import";

const bookingFormSchema = insertBookingSchema.extend({
  eventDate: z.string(),
});

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"year" | "month" | "week" | "day">("month");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showExpiredEnquiries, setShowExpiredEnquiries] = useState(false);

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

  const { data: enquiries = [] } = useQuery({
    queryKey: ["/api/enquiries"],
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
  });

  const handleCalendarSync = (provider: 'google' | 'apple') => {
    if (provider === 'google') {
      // Create Google Calendar export
      const googleCalUrl = createGoogleCalendarUrl();
      window.open(googleCalUrl, '_blank');
    } else if (provider === 'apple') {
      // Create Apple Calendar export
      const icalData = createICalData();
      downloadICalFile(icalData);
    }
    
    toast({
      title: "Calendar Sync",
      description: `${provider === 'google' ? 'Google' : 'Apple'} Calendar sync initiated`,
    });
  };

  const createGoogleCalendarUrl = () => {
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const confirmedBookings = bookings.filter((b: Booking) => b.status === 'confirmed');
    
    if (confirmedBookings.length === 0) {
      return baseUrl;
    }
    
    // For multiple events, we'll open Google Calendar's main page
    return 'https://calendar.google.com/calendar/u/0/r/eventedit';
  };

  const createICalData = () => {
    const icalHeader = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MusoBuddy//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:MusoBuddy Performances',
      'X-WR-TIMEZONE:Europe/London'
    ].join('\r\n');

    const icalFooter = 'END:VCALENDAR';

    const events = bookings
      .filter((b: Booking) => b.status === 'confirmed')
      .map((booking: Booking) => {
        const startDate = new Date(booking.eventDate);
        const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000); // 4 hours duration
        
        return [
          'BEGIN:VEVENT',
          `DTSTART:${formatICalDate(startDate)}`,
          `DTEND:${formatICalDate(endDate)}`,
          `SUMMARY:${booking.title}`,
          `DESCRIPTION:Performance for ${booking.clientName}\\nVenue: ${booking.venue}\\nFee: £${booking.fee}`,
          `LOCATION:${booking.venue}`,
          `STATUS:CONFIRMED`,
          `UID:${booking.id}@musobuddy.com`,
          `DTSTAMP:${formatICalDate(new Date())}`,
          'END:VEVENT'
        ].join('\r\n');
      });

    return [icalHeader, ...events, icalFooter].join('\r\n');
  };

  const formatICalDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const downloadICalFile = (icalData: string) => {
    const blob = new Blob([icalData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'musobuddy-calendar.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
      case "completed": return "bg-purple-100 text-purple-800 border-purple-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getCalendarModifierColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-200 text-green-900 hover:bg-green-300";
      case "completed": return "bg-purple-200 text-purple-900 hover:bg-purple-300";
      case "cancelled": return "bg-red-200 text-red-900 hover:bg-red-300";
      default: return "bg-yellow-200 text-yellow-900 hover:bg-yellow-300";
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

  // Helper function to check if an enquiry is expired
  const isEnquiryExpired = (enquiry: any) => {
    if (!enquiry.eventDate) return false;
    const eventDate = new Date(enquiry.eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate < today;
  };

  // Get potential bookings from enquiries and contracts
  const getPotentialBookings = () => {
    const potentialEvents = [];
    
    // Add enquiries with dates, filtering expired ones unless toggle is enabled
    enquiries.forEach((enquiry: any) => {
      if (enquiry.eventDate) {
        const isExpired = isEnquiryExpired(enquiry);
        
        // Skip expired enquiries if toggle is off
        if (isExpired && !showExpiredEnquiries) {
          return;
        }
        
        potentialEvents.push({
          id: `enquiry-${enquiry.id}`,
          title: enquiry.title,
          clientName: enquiry.clientName,
          eventDate: enquiry.eventDate,
          eventTime: enquiry.eventTime || 'TBC',
          venue: enquiry.venue || 'TBC',
          fee: enquiry.estimatedValue || 0,
          status: `enquiry-${enquiry.status}`,
          source: 'enquiry',
          isExpired: isExpired
        });
      }
    });
    
    // Add signed contracts that don't have bookings yet
    contracts.forEach((contract: any) => {
      if (contract.status === 'signed') {
        const hasBooking = bookings.some((b: Booking) => b.contractId === contract.id);
        if (!hasBooking) {
          potentialEvents.push({
            id: `contract-${contract.id}`,
            title: `${contract.clientName} Performance`,
            clientName: contract.clientName,
            eventDate: contract.eventDate,
            eventTime: contract.eventTime,
            venue: contract.venue,
            fee: contract.fee,
            status: 'contract-signed',
            source: 'contract'
          });
        }
      }
    });
    
    return potentialEvents;
  };

  const potentialBookings = getPotentialBookings();
  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];
  
  const getSelectedDatePotentialBookings = () => {
    if (!selectedDate) return [];
    return potentialBookings.filter((booking: any) => {
      const bookingDate = new Date(booking.eventDate);
      return bookingDate.toDateString() === selectedDate.toDateString();
    });
  };

  const selectedDatePotentialBookings = getSelectedDatePotentialBookings();

  // Get all bookings and enquiries for the current month
  const getCurrentMonthEvents = () => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Get confirmed bookings for the month
    const monthBookings = bookings.filter((booking: Booking) => {
      const bookingDate = new Date(booking.eventDate);
      return bookingDate.getMonth() === currentMonth && 
             bookingDate.getFullYear() === currentYear;
    });
    
    // Get potential bookings (enquiries/contracts) for the month
    const monthPotentialBookings = getPotentialBookings().filter((booking: any) => {
      const bookingDate = new Date(booking.eventDate);
      return bookingDate.getMonth() === currentMonth && 
             bookingDate.getFullYear() === currentYear &&
             (showExpiredEnquiries || !booking.isExpired);
    });
    
    // Combine and sort by date
    const allEvents = [...monthBookings, ...monthPotentialBookings];
    return allEvents.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  };

  // Helper functions for different view modes
  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getMonthsInYear = (year: number) => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(new Date(year, i, 1));
    }
    return months;
  };

  const getBookingsForMonth = (month: Date) => {
    // Get confirmed bookings for the month
    const monthBookings = bookings.filter((booking: Booking) => {
      const bookingDate = new Date(booking.eventDate);
      return bookingDate.getMonth() === month.getMonth() && 
             bookingDate.getFullYear() === month.getFullYear();
    });
    
    // Get potential bookings (enquiries/contracts) for the month
    const monthPotentialBookings = getPotentialBookings().filter((booking: any) => {
      const bookingDate = new Date(booking.eventDate);
      return bookingDate.getMonth() === month.getMonth() && 
             bookingDate.getFullYear() === month.getFullYear();
    });
    
    return [...monthBookings, ...monthPotentialBookings];
  };

  const renderYearView = () => {
    const months = getMonthsInYear(currentDate.getFullYear());
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{currentDate.getFullYear()}</h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1))}
            >
              ← Previous Year
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1))}
            >
              Next Year →
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {months.map((month, index) => {
            const monthBookings = getBookingsForMonth(month);
            const monthName = month.toLocaleDateString("en-GB", { month: "long" });
            
            return (
              <Card key={index} className="p-4">
                <div className="text-center mb-3">
                  <h3 className="font-semibold text-lg">{monthName}</h3>
                  <p className="text-sm text-gray-600">{monthBookings.length} events</p>
                </div>
                
                <div className="space-y-2">
                  {monthBookings.slice(0, 3).map((booking: any) => {
                    // Handle both regular bookings and potential bookings
                    const isRegularBooking = booking.contractId !== undefined;
                    const statusColor = isRegularBooking 
                      ? getStatusColor(booking.status)
                      : booking.status === 'enquiry-new' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        booking.status === 'enquiry-qualified' || booking.status === 'enquiry-contract_sent' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        booking.status === 'enquiry-confirmed' ? 'bg-green-100 text-green-800 border-green-200' :
                        booking.status === 'contract-signed' ? 'bg-green-100 text-green-800 border-green-200' :
                        booking.isExpired ? 'bg-gray-100 text-gray-600 border-gray-200 opacity-60' :
                        'bg-amber-100 text-amber-800 border-amber-200';
                    
                    return (
                      <div key={booking.id} className={`p-2 rounded text-xs ${statusColor}`}>
                        <div className="font-medium truncate">{booking.title}</div>
                        <div className="text-xs opacity-75">
                          {new Date(booking.eventDate).getDate()} - {booking.clientName}
                        </div>
                      </div>
                    );
                  })}
                  
                  {monthBookings.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{monthBookings.length - 3} more
                    </div>
                  )}
                  
                  {monthBookings.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-2">
                      No events
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => {
                    setCurrentDate(month);
                    setSelectedDate(month);
                    setViewMode("month");
                  }}
                >
                  View Month
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            Week of {weekDays[0].toLocaleDateString("en-GB", { month: "long", day: "numeric" })}
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prevWeek = new Date(currentDate);
                prevWeek.setDate(currentDate.getDate() - 7);
                setCurrentDate(prevWeek);
              }}
            >
              ← Previous Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextWeek = new Date(currentDate);
                nextWeek.setDate(currentDate.getDate() + 7);
                setCurrentDate(nextWeek);
              }}
            >
              Next Week →
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const dayBookings = getBookingsForDate(day);
            const dayName = day.toLocaleDateString("en-GB", { weekday: "short" });
            
            return (
              <Card key={index} className="p-3">
                <div className="text-center mb-2">
                  <div className="font-medium">{dayName}</div>
                  <div className="text-2xl font-bold">{day.getDate()}</div>
                </div>
                
                <div className="space-y-1">
                  {dayBookings.map((booking: Booking) => (
                    <div key={booking.id} className={`p-1 rounded text-xs ${getStatusColor(booking.status)}`}>
                      <div className="font-medium truncate">{booking.title}</div>
                      <div className="text-xs opacity-75">{booking.eventTime}</div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {currentDate.toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const prevDay = new Date(currentDate);
                prevDay.setDate(currentDate.getDate() - 1);
                setCurrentDate(prevDay);
              }}
            >
              ← Previous Day
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextDay = new Date(currentDate);
                nextDay.setDate(currentDate.getDate() + 1);
                setCurrentDate(nextDay);
              }}
            >
              Next Day →
            </Button>
          </div>
        </div>
        
        <Card className="p-6">
          {dayBookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No bookings on this date</p>
              <p className="text-sm">Available for new gigs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dayBookings.map((booking: Booking) => (
                <div key={booking.id} className={`p-4 rounded-lg border-2 ${getStatusColor(booking.status)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-lg">{booking.title}</h4>
                    <Badge className={getStatusColor(booking.status).replace('border-', '').replace('bg-', 'bg-').replace('text-', 'text-')}>
                      {booking.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="font-semibold text-green-600 text-lg">
                      £{Number(booking.fee).toLocaleString()}
                    </span>
                    <Button size="sm" variant="outline">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

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
                variant={viewMode === "year" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("year")}
                className={viewMode === "year" ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
              >
                Year
              </Button>
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

        {/* Calendar Views */}
        {viewMode === "year" && (
          <Card className="col-span-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance Calendar - Year View</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleCalendarSync('google')}>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCalendarSync('apple')}>
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                    </svg>
                    Apple
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderYearView()}
            </CardContent>
          </Card>
        )}

        {viewMode === "week" && (
          <Card className="col-span-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance Calendar - Week View</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleCalendarSync('google')}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Google
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCalendarSync('apple')}>
                    <Download className="w-4 h-4 mr-1" />
                    Apple
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderWeekView()}
            </CardContent>
          </Card>
        )}

        {viewMode === "day" && (
          <Card className="col-span-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Performance Calendar - Day View</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleCalendarSync('google')}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Google
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCalendarSync('apple')}>
                    <Download className="w-4 h-4 mr-1" />
                    Apple
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderDayView()}
            </CardContent>
          </Card>
        )}

        {viewMode === "month" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Performance Calendar</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={showExpiredEnquiries ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setShowExpiredEnquiries(!showExpiredEnquiries)}
                      className="text-xs"
                    >
                      {showExpiredEnquiries ? (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Hide Expired
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 mr-1" />
                          Show Expired
                        </>
                      )}
                    </Button>
                    <CalendarImport />
                    <Button variant="outline" size="sm" onClick={() => handleCalendarSync('google')}>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Google
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCalendarSync('apple')}>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                      </svg>
                      Apple
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  modifiers={{
                    today: [new Date()],
                    confirmed: bookings.filter((b: Booking) => b.status === 'confirmed').map((booking: Booking) => new Date(booking.eventDate)),
                    completed: bookings.filter((b: Booking) => b.status === 'completed').map((booking: Booking) => new Date(booking.eventDate)),
                    cancelled: bookings.filter((b: Booking) => b.status === 'cancelled').map((booking: Booking) => new Date(booking.eventDate)),
                    newEnquiry: potentialBookings.filter((b: any) => b.status === 'enquiry-new' && !b.isExpired).map((booking: any) => new Date(booking.eventDate)),
                    inProgressEnquiry: potentialBookings.filter((b: any) => (b.status === 'enquiry-qualified' || b.status === 'enquiry-contract_sent') && !b.isExpired).map((booking: any) => new Date(booking.eventDate)),
                    confirmedEnquiry: potentialBookings.filter((b: any) => b.status === 'enquiry-confirmed' && !b.isExpired).map((booking: any) => new Date(booking.eventDate)),
                    signedContract: potentialBookings.filter((b: any) => b.status === 'contract-signed').map((booking: any) => new Date(booking.eventDate)),
                    expiredEnquiry: potentialBookings.filter((b: any) => b.isExpired && b.source === 'enquiry').map((booking: any) => new Date(booking.eventDate)),
                  }}
                  modifiersClassNames={{
                    today: "bg-purple-100 text-purple-900 font-bold ring-2 ring-purple-400",
                    confirmed: "bg-green-200 text-green-900 font-semibold hover:bg-green-300",
                    completed: "bg-purple-200 text-purple-900 font-semibold hover:bg-purple-300",
                    cancelled: "bg-red-200 text-red-900 font-semibold hover:bg-red-300",
                    newEnquiry: "bg-yellow-200 text-yellow-900 font-semibold hover:bg-yellow-300",
                    inProgressEnquiry: "bg-blue-200 text-blue-900 font-semibold hover:bg-blue-300",
                    confirmedEnquiry: "bg-green-200 text-green-900 font-semibold hover:bg-green-300",
                    signedContract: "bg-green-200 text-green-900 font-semibold hover:bg-green-300",
                    expiredEnquiry: "bg-gray-200 text-gray-500 font-normal opacity-50 hover:bg-gray-300",
                  }}
                />
                
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-200 border border-yellow-300 rounded"></div>
                    <span>New Enquiry</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-200 border border-blue-300 rounded"></div>
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
                    <span>Confirmed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-200 border border-red-300 rounded"></div>
                    <span>Cancelled</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-100 border border-purple-400 rounded ring-1 ring-purple-400"></div>
                    <span>Today</span>
                  </div>
                  {showExpiredEnquiries && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-200 border border-gray-300 rounded opacity-50"></div>
                      <span className="text-gray-500">Expired Enquiry</span>
                    </div>
                  )}
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

              {selectedDateBookings.length === 0 && selectedDatePotentialBookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No bookings on this date</p>
                  <p className="text-sm">Available for new gigs</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Confirmed Bookings */}
                  {selectedDateBookings.map((booking: Booking) => (
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
                  ))}
                  
                  {/* Potential Bookings */}
                  {selectedDatePotentialBookings.map((booking: any) => (
                    <div key={booking.id} className={`p-4 rounded-lg border-2 ${booking.isExpired ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={`font-semibold ${booking.isExpired ? 'text-gray-500' : ''}`}>
                          {booking.title}
                          {booking.isExpired && (
                            <span className="ml-2 text-xs text-gray-400">(Expired)</span>
                          )}
                        </h4>
                        <Badge className={
                          booking.isExpired ? 'bg-gray-100 text-gray-600' :
                          booking.status === 'enquiry-new' ? 'bg-yellow-100 text-yellow-800' :
                          booking.status === 'enquiry-qualified' || booking.status === 'enquiry-contract_sent' ? 'bg-blue-100 text-blue-800' :
                          booking.status === 'enquiry-confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'contract-signed' ? 'bg-green-100 text-green-800' :
                          'bg-amber-100 text-amber-800'
                        }>
                          {booking.isExpired ? 'Expired Enquiry' :
                           booking.status === 'enquiry-new' ? 'New Enquiry' :
                           booking.status === 'enquiry-qualified' || booking.status === 'enquiry-contract_sent' ? 'In Progress' :
                           booking.status === 'enquiry-confirmed' ? 'Confirmed Enquiry' :
                           booking.status === 'contract-signed' ? 'Contract Signed' :
                           'Potential'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className={`flex items-center space-x-2 ${booking.isExpired ? 'text-gray-500' : 'text-gray-600'}`}>
                          <User className="w-4 h-4" />
                          <span>{booking.clientName}</span>
                        </div>
                        
                        <div className={`flex items-center space-x-2 ${booking.isExpired ? 'text-gray-500' : 'text-gray-600'}`}>
                          <Clock className="w-4 h-4" />
                          <span>{formatTime(booking.eventTime)}</span>
                        </div>
                        
                        <div className={`flex items-center space-x-2 ${booking.isExpired ? 'text-gray-500' : 'text-gray-600'}`}>
                          <MapPin className="w-4 h-4" />
                          <span>{booking.venue}</span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-2 border-t">
                          <span className={`font-semibold ${booking.isExpired ? 'text-gray-500' : 'text-amber-600'}`}>
                            £{Number(booking.fee).toLocaleString()}
                          </span>
                          <div className="flex space-x-2">
                            {booking.source === 'enquiry' && (
                              <Link href="/enquiries">
                                <Button size="sm" variant="outline" className={booking.isExpired ? 'opacity-50' : ''}>
                                  View Enquiry
                                </Button>
                              </Link>
                            )}
                            {booking.source === 'contract' && (
                              <Link href="/contracts">
                                <Button size="sm" variant="outline" className={booking.isExpired ? 'opacity-50' : ''}>
                                  View Contract
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        )}

        {/* Upcoming Gigs Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })} Events
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCalendarSync('google')}
                  className="text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCalendarSync('apple')}
                  className="text-sm"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Apple
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getCurrentMonthEvents().map((event: any) => {
                const isRegularBooking = event.contractId !== undefined;
                const isExpired = event.isExpired;
                
                return (
                  <div key={event.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    isExpired ? 'bg-gray-50 opacity-60' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className={`text-sm font-medium ${
                          isExpired ? 'text-gray-500' : 'text-purple-600'
                        }`}>
                          {new Date(event.eventDate).toLocaleDateString("en-GB", { month: "short" }).toUpperCase()}
                        </div>
                        <div className={`text-lg font-bold ${
                          isExpired ? 'text-gray-500' : ''
                        }`}>
                          {new Date(event.eventDate).getDate()}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className={`font-medium ${
                          isExpired ? 'text-gray-500' : ''
                        }`}>
                          {event.title}
                          {isExpired && <span className="ml-2 text-xs text-gray-400">(Expired)</span>}
                        </h4>
                        <p className={`text-sm ${
                          isExpired ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                          {event.venue} • {event.eventTime}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={`font-semibold ${
                        isExpired ? 'text-gray-500' : 
                        isRegularBooking ? 'text-green-600' : 'text-amber-600'
                      }`}>
                        £{Number(event.fee).toLocaleString()}
                      </p>
                      <Badge className={
                        isExpired ? 'bg-gray-100 text-gray-600' :
                        isRegularBooking ? getStatusColor(event.status).replace('border-', '').replace('bg-', 'bg-').replace('text-', 'text-') :
                        event.status === 'enquiry-new' ? 'bg-yellow-100 text-yellow-800' :
                        event.status === 'enquiry-qualified' || event.status === 'enquiry-contract_sent' ? 'bg-blue-100 text-blue-800' :
                        event.status === 'enquiry-confirmed' ? 'bg-green-100 text-green-800' :
                        event.status === 'contract-signed' ? 'bg-green-100 text-green-800' :
                        'bg-amber-100 text-amber-800'
                      }>
                        {isExpired ? 'Expired' :
                         isRegularBooking ? event.status :
                         event.status === 'enquiry-new' ? 'New Enquiry' :
                         event.status === 'enquiry-qualified' || event.status === 'enquiry-contract_sent' ? 'In Progress' :
                         event.status === 'enquiry-confirmed' ? 'Confirmed' :
                         event.status === 'contract-signed' ? 'Signed' :
                         'Potential'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              
              {getCurrentMonthEvents().length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg">No events this month</p>
                  <p>Your bookings and enquiries will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Block Time Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Block Time</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Wedding Reception, Private Party" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="eventTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter venue address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee (£)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDialogClose(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={createBookingMutation.isPending}
                >
                  {createBookingMutation.isPending ? "Blocking..." : "Block Time"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}