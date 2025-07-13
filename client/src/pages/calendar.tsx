import { useState, useEffect, useMemo } from "react";
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
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, Filter, Download, ExternalLink, Eye, EyeOff, AlertTriangle, Menu } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { insertBookingSchema, type Booking } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import CalendarImport from "@/components/calendar-import";
import Sidebar from "@/components/sidebar";

const bookingFormSchema = insertBookingSchema.extend({
  eventDate: z.string(),
});

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"year" | "month" | "week" | "day">("month");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showExpiredEnquiries, setShowExpiredEnquiries] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Always call hooks in the same order
  const [location, navigate] = useLocation();
  const { toast } = useToast();

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

  // All data fetching hooks - always called
  const { data: bookings = [], isLoading, error: bookingsError } = useQuery({
    queryKey: ["/api/bookings"],
    retry: 2,
    retryDelay: 1000,
  });

  const { data: enquiries = [], error: enquiriesError } = useQuery({
    queryKey: ["/api/enquiries"],
    retry: 2,
    retryDelay: 1000,
  });

  const { data: contracts = [], error: contractsError } = useQuery({
    queryKey: ["/api/contracts"],
    retry: 2,
    retryDelay: 1000,
  });

  const { data: conflicts = [], error: conflictsError } = useQuery({
    queryKey: ["/api/conflicts"],
    retry: 2,
    retryDelay: 1000,
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
      toast({
        title: "Success",
        description: "Date marked as unavailable successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark date as unavailable",
        variant: "destructive",
      });
      console.error("Create booking error:", error);
    },
  });

  const transferEnquiriesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/transfer-enquiries-to-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      toast({
        title: "Transfer Complete",
        description: `Successfully transferred ${data?.details?.transferred || 0} enquiries to calendar`,
      });
    },
    onError: (error) => {
      console.error("Error transferring enquiries:", error);
      toast({
        title: "Error",
        description: "Failed to transfer enquiries to calendar. Please try again.",
        variant: "destructive",
      });
    },
  });

  // All useEffect hooks
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'block') {
        setIsDialogOpen(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error("Error checking URL parameters:", error);
    }
  }, [location]);

  useEffect(() => {
    if (!isDialogOpen) {
      form.reset();
    }
  }, [isDialogOpen, form]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen]);

  // Helper functions (no hooks inside)
  const isEnquiryExpired = (enquiry: any) => {
    try {
      if (!enquiry || !enquiry.eventDate) return false;
      const eventDate = new Date(enquiry.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return eventDate < today;
    } catch (error) {
      console.error("Error checking if enquiry is expired:", error);
      return false;
    }
  };

  const getPotentialBookings = () => {
    try {
      const potentialEvents = [];

      if (Array.isArray(enquiries)) {
        enquiries.forEach((enquiry: any) => {
          try {
            if (enquiry && enquiry.eventDate) {
              const isExpired = isEnquiryExpired(enquiry);

              if (isExpired && !showExpiredEnquiries) {
                return;
              }

              potentialEvents.push({
                id: `enquiry-${enquiry.id}`,
                title: enquiry.title || 'Untitled Enquiry',
                clientName: enquiry.clientName || 'Unknown Client',
                eventDate: enquiry.eventDate,
                eventTime: enquiry.eventTime || 'TBC',
                venue: enquiry.venue || 'TBC',
                fee: enquiry.estimatedValue || 0,
                status: `enquiry-${enquiry.status || 'new'}`,
                source: 'enquiry',
                isExpired: isExpired
              });
            }
          } catch (enquiryError) {
            console.error("Error processing enquiry:", enquiry, enquiryError);
          }
        });
      }

      if (Array.isArray(contracts)) {
        contracts.forEach((contract: any) => {
          try {
            if (contract && contract.status === 'signed') {
              const hasBooking = Array.isArray(bookings) ? 
                bookings.some((b: Booking) => b.contractId === contract.id) : false;

              if (!hasBooking) {
                potentialEvents.push({
                  id: `contract-${contract.id}`,
                  title: `${contract.clientName || 'Unknown Client'} Performance`,
                  clientName: contract.clientName || 'Unknown Client',
                  eventDate: contract.eventDate,
                  eventTime: contract.eventTime,
                  venue: contract.venue,
                  fee: contract.fee || 0,
                  status: 'contract-signed',
                  source: 'contract'
                });
              }
            }
          } catch (contractError) {
            console.error("Error processing contract:", contract, contractError);
          }
        });
      }

      return potentialEvents;
    } catch (error) {
      console.error("Error in getPotentialBookings:", error);
      return [];
    }
  };

  const getStatusColor = (status: string) => {
    try {
      switch (status) {
        case "confirmed": return "bg-green-100 text-green-800 border-green-200";
        case "completed": return "bg-purple-100 text-purple-800 border-purple-200";
        case "cancelled": return "bg-red-100 text-red-800 border-red-200";
        default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
      }
    } catch (error) {
      console.error("Error getting status color:", error);
      return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", dateString, error);
      return "Invalid Date";
    }
  };

  const formatTime = (timeString: string) => {
    try {
      return timeString || "Time TBC";
    } catch (error) {
      console.error("Error formatting time:", timeString, error);
      return "Time TBC";
    }
  };

  const getBookingsForDate = (date: Date) => {
    try {
      if (!date || !Array.isArray(bookings)) {
        return [];
      }

      const filteredBookings = bookings.filter((booking: Booking) => {
        try {
          if (!booking || !booking.eventDate) {
            return false;
          }

          const bookingDate = new Date(booking.eventDate);
          const normalizedBookingDate = new Date(
            bookingDate.getFullYear(),
            bookingDate.getMonth(),
            bookingDate.getDate()
          );

          const normalizedSelectedDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          );

          return normalizedBookingDate.getTime() === normalizedSelectedDate.getTime();
        } catch (bookingError) {
          console.error("Error processing booking:", booking, bookingError);
          return false;
        }
      });

      return filteredBookings;
    } catch (error) {
      console.error("Error filtering bookings for date:", error);
      return [];
    }
  };

  const getBookingConflicts = (bookingId: string) => {
    try {
      if (!Array.isArray(conflicts)) return [];
      return conflicts.filter((conflict: any) => 
        (conflict?.enquiryId && `enquiry-${conflict.enquiryId}` === bookingId) ||
        (conflict?.conflictType === 'booking' && conflict?.conflictId?.toString() === bookingId)
      );
    } catch (error) {
      console.error("Error getting booking conflicts:", error);
      return [];
    }
  };

  const getCurrentMonthEvents = () => {
    try {
      const potentialBookings = getPotentialBookings();

      const monthBookings = Array.isArray(bookings) ? bookings.filter((booking: Booking) => {
        try {
          if (!booking?.eventDate) return false;
          const bookingDate = new Date(booking.eventDate);
          return bookingDate.getMonth() === currentDate.getMonth() && 
                 bookingDate.getFullYear() === currentDate.getFullYear();
        } catch (error) {
          console.error("Error filtering month booking:", booking, error);
          return false;
        }
      }) : [];

      const monthPotentialBookings = Array.isArray(potentialBookings) ? potentialBookings.filter((booking: any) => {
        try {
          if (!booking?.eventDate) return false;
          const bookingDate = new Date(booking.eventDate);
          return bookingDate.getMonth() === currentDate.getMonth() && 
                 bookingDate.getFullYear() === currentDate.getFullYear();
        } catch (error) {
          console.error("Error filtering month potential booking:", booking, error);
          return false;
        }
      }) : [];

      return [...monthBookings, ...monthPotentialBookings].sort((a, b) => {
        try {
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        } catch (error) {
          console.error("Error sorting events:", error);
          return 0;
        }
      });
    } catch (error) {
      console.error("Error getting current month events:", error);
      return [];
    }
  };

  const createICalData = () => {
    try {
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

      const events = Array.isArray(bookings) ? bookings
        .filter((b: Booking) => b && b.status === 'confirmed' && b.eventDate)
        .map((booking: Booking) => {
          try {
            const startDate = new Date(booking.eventDate);
            const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

            return [
              'BEGIN:VEVENT',
              `DTSTART:${formatICalDate(startDate)}`,
              `DTEND:${formatICalDate(endDate)}`,
              `SUMMARY:${booking.title || 'Untitled Event'}`,
              `DESCRIPTION:Performance for ${booking.clientName || 'Unknown Client'}\\nVenue: ${booking.venue || 'TBC'}\\nFee: £${booking.fee || 0}`,
              `LOCATION:${booking.venue || 'TBC'}`,
              `STATUS:CONFIRMED`,
              `UID:${booking.id}@musobuddy.com`,
              `DTSTAMP:${formatICalDate(new Date())}`,
              'END:VEVENT'
            ].join('\r\n');
          } catch (eventError) {
            console.error("Error creating event for booking:", booking, eventError);
            return '';
          }
        })
        .filter(event => event.length > 0) : [];

      return [icalHeader, ...events, icalFooter].join('\r\n');
    } catch (error) {
      console.error("Error creating iCal data:", error);
      return null;
    }
  };

  const formatICalDate = (date: Date) => {
    try {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    } catch (error) {
      console.error("Error formatting iCal date:", error);
      return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }
  };

  const downloadICalFile = (icalData: string, filename: string = 'musobuddy-calendar.ics') => {
    try {
      const blob = new Blob([icalData], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading iCal file:", error);
      throw error;
    }
  };

  // Memoized calculations - no hooks inside
  const potentialBookings = useMemo(() => {
    return getPotentialBookings();
  }, [enquiries, contracts, bookings, showExpiredEnquiries]);

  const selectedDateBookings = useMemo(() => {
    return selectedDate ? getBookingsForDate(selectedDate) : [];
  }, [selectedDate, bookings]);

  const selectedDatePotentialBookings = useMemo(() => {
    try {
      if (!selectedDate) return [];
      return potentialBookings.filter((booking: any) => {
        try {
          const bookingDate = new Date(booking.eventDate);
          return bookingDate.toDateString() === selectedDate.toDateString();
        } catch (error) {
          console.error("Error filtering potential booking:", booking, error);
          return false;
        }
      });
    } catch (error) {
      console.error("Error getting selected date potential bookings:", error);
      return [];
    }
  }, [selectedDate, potentialBookings]);

  const calendarModifiers = useMemo(() => {
    try {
      const normalizeDate = (dateString: string) => {
        try {
          const date = new Date(dateString);
          return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        } catch (error) {
          console.error("Error normalizing date:", dateString, error);
          return new Date();
        }
      };

      return {
        today: [new Date()],
        confirmed: Array.isArray(bookings) ? bookings
          .filter((b: Booking) => b?.status === 'confirmed' && b?.eventDate)
          .map((booking: Booking) => normalizeDate(booking.eventDate)) : [],
        completed: Array.isArray(bookings) ? bookings
          .filter((b: Booking) => b?.status === 'completed' && b?.eventDate)
          .map((booking: Booking) => normalizeDate(booking.eventDate)) : [],
        cancelled: Array.isArray(bookings) ? bookings
          .filter((b: Booking) => b?.status === 'cancelled' && b?.eventDate)
          .map((booking: Booking) => normalizeDate(booking.eventDate)) : [],
        newEnquiry: Array.isArray(potentialBookings) ? potentialBookings
          .filter((b: any) => b?.status === 'enquiry-new' && !b?.isExpired && b?.eventDate)
          .map((booking: any) => normalizeDate(booking.eventDate)) : [],
        inProgressEnquiry: Array.isArray(potentialBookings) ? potentialBookings
          .filter((b: any) => (b?.status === 'enquiry-qualified' || b?.status === 'enquiry-contract_sent') && !b?.isExpired && b?.eventDate)
          .map((booking: any) => normalizeDate(booking.eventDate)) : [],
        confirmedEnquiry: Array.isArray(potentialBookings) ? potentialBookings
          .filter((b: any) => b?.status === 'enquiry-confirmed' && !b?.isExpired && b?.eventDate)
          .map((booking: any) => normalizeDate(booking.eventDate)) : [],
        signedContract: Array.isArray(potentialBookings) ? potentialBookings
          .filter((b: any) => b?.status === 'contract-signed' && b?.eventDate)
          .map((booking: any) => normalizeDate(booking.eventDate)) : [],
        expiredEnquiry: showExpiredEnquiries && Array.isArray(potentialBookings) ? potentialBookings
          .filter((b: any) => b?.isExpired && b?.source === 'enquiry' && b?.eventDate)
          .map((booking: any) => normalizeDate(booking.eventDate)) : [],
      };
    } catch (error) {
      console.error("Error calculating calendar modifiers:", error);
      return {
        today: [new Date()],
        confirmed: [],
        completed: [],
        cancelled: [],
        newEnquiry: [],
        inProgressEnquiry: [],
        confirmedEnquiry: [],
        signedContract: [],
        expiredEnquiry: [],
      };
    }
  }, [bookings, potentialBookings, showExpiredEnquiries]);

  // Event handlers
  const handleCalendarExport = () => {
    try {
      console.log("Starting calendar export...");
      const icalData = createICalData();

      if (!icalData) {
        throw new Error("No calendar data to export");
      }

      downloadICalFile(icalData, "musobuddy-calendar.ics");

      toast({
        title: "Calendar Export",
        description: "Calendar file downloaded successfully - works with Google, Apple, Outlook, and other calendar apps",
      });
    } catch (error) {
      console.error("Calendar export failed:", error);
      toast({
        title: "Export Failed",
        description: "Unable to export calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
    }
  };

  const onSubmit = (data: z.infer<typeof bookingFormSchema>) => {
    try {
      const eventDate = new Date(data.eventDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (eventDate < today) {
        toast({
          title: "Error",
          description: "Cannot create booking for past dates",
          variant: "destructive",
        });
        return;
      }

      console.log("Submitting booking data:", data);
      createBookingMutation.mutate(data);
    } catch (error) {
      console.error("Error in form submission:", error);
      toast({
        title: "Error",
        description: "Failed to process form data",
        variant: "destructive",
      });
    }
  };

  // Early returns for loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (bookingsError || enquiriesError || contractsError || conflictsError) {
    console.error("Calendar API Errors:", {
      bookingsError,
      enquiriesError, 
      contractsError,
      conflictsError
    });

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <p>Error loading calendar data</p>
          <p className="text-sm mt-2">Check console for details</p>
        </div>
      </div>
    );
  }

  const calendarModifiersClassNames = {
    today: "bg-blue-500 text-white",
    confirmed: "bg-green-500 text-white",
    completed: "bg-purple-500 text-white",
    cancelled: "bg-red-500 text-white",
    newEnquiry: "bg-yellow-500 text-white",
    inProgressEnquiry: "bg-blue-500 text-white",
    confirmedEnquiry: "bg-green-500 text-white",
    signedContract: "bg-emerald-500 text-white",
    expiredEnquiry: "bg-gray-400 text-white opacity-50",
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-64 flex flex-col min-w-0">
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900 ml-12 md:ml-0">Calendar</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Mark Unavailable
            </Button>

            <Button
              onClick={() => setShowExpiredEnquiries(!showExpiredEnquiries)}
              variant="outline"
              size="sm"
              className="text-sm"
            >
              {showExpiredEnquiries ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {showExpiredEnquiries ? 'Hide' : 'Show'} Expired Enquiries
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Calendar</CardTitle>
                    <div className="flex items-center space-x-2">
                      <CalendarImport />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCalendarExport}
                        className="text-sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export Calendar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentDate}
                    onMonthChange={setCurrentDate}
                    modifiers={calendarModifiers}
                    modifiersClassNames={calendarModifiersClassNames}
                    className="rounded-md border w-full"
                  />

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Confirmed</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>New Enquiry</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>In Progress</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span>Contract Signed</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Cancelled</span>
                    </div>
                    {showExpiredEnquiries && (
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-gray-400 rounded-full opacity-50"></div>
                        <span className="text-gray-500">Expired Enquiry</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selected Date Details */}
            <div>
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

                  {selectedDate && (
                    (selectedDateBookings.length === 0 && selectedDatePotentialBookings.length === 0) ? (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>No bookings on this date</p>
                        <p className="text-sm">Available for new gigs</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Confirmed Bookings */}
                        {selectedDateBookings.map((booking: Booking) => {
                          try {
                            const bookingConflicts = getBookingConflicts(booking.id.toString());
                            const hasConflicts = bookingConflicts.length > 0;

                            return (
                              <div key={booking.id} className={`p-4 rounded-lg border-2 ${getStatusColor(booking.status)}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold flex items-center space-x-2">
                                    <span>{booking.title}</span>
                                    {hasConflicts && (
                                      <AlertTriangle className="w-4 h-4 text-red-500" />
                                    )}
                                  </h4>
                                  <div className="flex items-center space-x-2">
                                    {hasConflicts && (
                                      <Badge variant="destructive" className="text-xs">
                                        CONFLICT
                                      </Badge>
                                    )}
                                    <Badge className={getStatusColor(booking.status).replace('border-', '').replace('bg-', 'bg-').replace('text-', 'text-')}>
                                      {booking.status}
                                    </Badge>
                                  </div>
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
                            );
                          } catch (error) {
                            console.error("Error rendering booking:", booking, error);
                            return null;
                          }
                        })}

                        {/* Potential Bookings */}
                        {selectedDatePotentialBookings.map((booking: any) => {
                          try {
                            const bookingConflicts = getBookingConflicts(booking.id);
                            const hasConflicts = bookingConflicts.length > 0;

                            return (
                              <div key={booking.id} className={`p-4 rounded-lg border-2 ${booking.isExpired ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-amber-50 border-amber-200'}`}>
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className={`font-semibold flex items-center space-x-2 ${booking.isExpired ? 'text-gray-500' : ''}`}>
                                    <span>
                                      {booking.title}
                                      {booking.isExpired && (
                                        <span className="ml-2 text-xs text-gray-400">(Expired)</span>
                                      )}
                                    </span>
                                    {hasConflicts && (
                                      <AlertTriangle className="w-4 h-4 text-red-500" />
                                    )}
                                  </h4>
                                  <div className="flex items-center space-x-2">
                                    {hasConflicts && (
                                      <Badge variant="destructive" className="text-xs">
                                        CONFLICT
                                      </Badge>
                                    )}
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
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className={booking.isExpired ? 'opacity-50' : ''}
                                          onClick={() => window.location.href = '/enquiries'}
                                        >
                                          View Enquiry
                                        </Button>
                                      )}
                                      {booking.source === 'contract' && (
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          className={booking.isExpired ? 'opacity-50' : ''}
                                          onClick={() => window.location.href = '/contracts'}
                                        >
                                          View Contract
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          } catch (error) {
                            console.error("Error rendering potential booking:", booking, error);
                            return null;
                          }
                        })}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>

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
                        onClick={handleCalendarExport}
                        className="text-sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Export Calendar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getCurrentMonthEvents().map((event: any) => {
                      try {
                        const isRegularBooking = event.contractId !== undefined;
                        const isExpired = event.isExpired;

                        return (
                          <div key={event.id} className={`flex items-center justify-between p-3 rounded-lg ${
                            isExpired ? 'bg-gray-50 opacity-60' : 'bg-gray-50'
                          }`}>
                            <div className="flex items-center space-x-4">
                              <div className="text-center">
                                <div className="text-sm font-medium">
                                  {new Date(event.eventDate).toLocaleDateString("en-GB", { day: "numeric" })}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(event.eventDate).toLocaleDateString("en-GB", { month: "short" })}
                                </div>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className={`font-medium ${isExpired ? 'text-gray-500' : 'text-gray-900'}`}>
                                    {event.title || `${event.clientName} Performance`}
                                  </h4>
                                  {isExpired && (
                                    <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                                      Expired
                                    </Badge>
                                  )}
                                </div>
                                <div className={`text-sm ${isExpired ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {event.clientName} • {event.venue}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${isExpired ? 'text-gray-400' : 'text-gray-900'}`}>
                                £{Number(event.fee).toLocaleString()}
                              </div>
                              <div className={`text-xs ${isExpired ? 'text-gray-400' : 'text-gray-500'}`}>
                                {formatTime(event.eventTime)}
                              </div>
                            </div>
                          </div>
                        );
                      } catch (error) {
                        console.error("Error rendering month event:", event, error);
                        return null;
                      }
                    })}

                    {getCurrentMonthEvents().length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p>No events this month</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Mark Unavailable Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Unavailable</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Personal time, Holiday, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          field.onChange(e);
                          if (e.target.value) {
                            setSelectedDate(new Date(e.target.value));
                          }
                        }}
                      />
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
                    <FormLabel>Time (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createBookingMutation.isPending}
                >
                  {createBookingMutation.isPending ? "Saving..." : "Mark Unavailable"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}