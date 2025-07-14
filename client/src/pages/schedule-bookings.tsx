import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Calendar as CalendarIcon, Clock, MapPin, User, Plus, Filter, Download, ExternalLink, Eye, EyeOff, AlertTriangle, Menu, ChevronLeft, ChevronRight, Settings, Info, Search, DollarSign, Edit, Trash2, Reply, AlertCircle, CheckCircle, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, FileSignature } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { insertBookingSchema, insertEnquirySchema, type Booking, type Enquiry } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import CalendarImport from "@/components/calendar-import";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import BookingStatusDialog from "@/components/BookingStatusDialog";
import { BookingDetailsDialog } from "@/components/BookingDetailsDialog";
import { useResponsive } from "@/hooks/useResponsive";
import { insertClientSchema, type InsertClient } from "@shared/schema";
import { 
  analyzeConflictSeverity, 
  getConflictCardStyling, 
  getConflictBadge, 
  parseConflictAnalysis, 
  getConflictActions, 
  formatConflictTooltip 
} from "@/utils/conflict-ui";

const bookingFormSchema = insertBookingSchema.extend({
  eventDate: z.string(),
});

const enquiryFormSchema = insertEnquirySchema.extend({
  eventDate: z.string().optional(),
}).omit({
  userId: true,
  title: true,
});

export default function ScheduleBookings() {
  // State for calendar functionality
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "pipeline">("calendar");
  const [calendarView, setCalendarView] = useState<"year" | "month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showExpiredEnquiries, setShowExpiredEnquiries] = useState(false);
  
  // State for enquiry/pipeline functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  
  // Dialog states
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isEnquiryDialogOpen, setIsEnquiryDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [bookingStatusDialogOpen, setBookingStatusDialogOpen] = useState(false);
  const [selectedBookingForUpdate, setSelectedBookingForUpdate] = useState<any>(null);
  const [bookingDetailsDialogOpen, setBookingDetailsDialogOpen] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any>(null);
  
  // Mobile states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDesktop } = useResponsive();
  
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Forms
  const bookingForm = useForm<z.infer<typeof bookingFormSchema>>({
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

  const enquiryForm = useForm<z.infer<typeof enquiryFormSchema>>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      eventDate: "",
      eventTime: "",
      venue: "",
      eventType: "",
      gigType: "",
      estimatedValue: "",
      message: "",
      source: "",
      notes: "",
    },
  });

  // Data fetching
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    retry: 2,
    retryDelay: 1000,
  });

  const { data: enquiries = [], isLoading: enquiriesLoading } = useQuery<Enquiry[]>({
    queryKey: ["/api/enquiries"],
    retry: 2,
    retryDelay: 1000,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    retry: 2,
    retryDelay: 1000,
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ["/api/conflicts"],
    staleTime: 30000,
    cacheTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Helper functions
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

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

  const detectConflicts = (enquiry: Enquiry) => {
    if (!enquiry.eventDate) return [];
    
    const conflicts = [];
    const enquiryDate = new Date(enquiry.eventDate);
    
    // Check against confirmed bookings
    bookings.forEach((booking: any) => {
      if (booking.eventDate) {
        const bookingDate = new Date(booking.eventDate);
        if (isSameDay(enquiryDate, bookingDate)) {
          conflicts.push({
            type: 'booking',
            id: booking.id,
            title: booking.title || 'Booking',
            eventDate: booking.eventDate,
            venue: booking.venue
          });
        }
      }
    });
    
    // Check against other confirmed enquiries
    enquiries.forEach((otherEnquiry: Enquiry) => {
      if (otherEnquiry.id !== enquiry.id && 
          otherEnquiry.eventDate && 
          otherEnquiry.status === 'confirmed') {
        const otherDate = new Date(otherEnquiry.eventDate);
        if (isSameDay(enquiryDate, otherDate)) {
          conflicts.push({
            type: 'enquiry',
            id: otherEnquiry.id,
            title: otherEnquiry.title || `${otherEnquiry.clientName} - ${otherEnquiry.eventType}`,
            eventDate: otherEnquiry.eventDate,
            venue: otherEnquiry.venue
          });
        }
      }
    });
    
    return conflicts;
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
    switch (status) {
      case "confirmed": return "bg-purple-100 text-purple-800 border-purple-200";
      case "signed": return "bg-green-100 text-green-800 border-green-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      case "new": return "bg-blue-100 text-blue-800 border-blue-200";
      case "qualified": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "contract_sent": return "bg-orange-100 text-orange-800 border-orange-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getBookingsForDate = (date: Date) => {
    try {
      if (!date || !Array.isArray(bookings)) {
        return [];
      }

      const filteredBookings = bookings.filter((booking: Booking) => {
        if (!booking.eventDate) return false;
        const bookingDate = new Date(booking.eventDate);
        return isSameDay(date, bookingDate);
      });

      return filteredBookings;
    } catch (error) {
      console.error("Error getting bookings for date:", error);
      return [];
    }
  };

  const getPotentialBookingsForDate = (date: Date) => {
    try {
      const potentialBookings = getPotentialBookings();
      return potentialBookings.filter((booking: any) => {
        if (!booking.eventDate) return false;
        const bookingDate = new Date(booking.eventDate);
        return isSameDay(date, bookingDate);
      });
    } catch (error) {
      console.error("Error getting potential bookings for date:", error);
      return [];
    }
  };

  // Parse gig types from settings
  const gigTypes = useMemo(() => {
    if (!settings.gigTypes) return [];
    
    if (typeof settings.gigTypes === 'string') {
      const cleanString = settings.gigTypes.replace(/^["']|["']$/g, '');
      if (cleanString.includes(',')) {
        return cleanString.split(',').map(item => 
          item.replace(/^["'\\[\]]+|["'\\[\]]+$/g, '').replace(/\\"/g, '').replace(/"/g, '').trim()
        ).filter(item => item.length > 0);
      }
      return [cleanString.replace(/^["'\\[\]]+|["'\\[\]]+$/g, '').replace(/\\"/g, '').replace(/"/g, '').trim()];
    }
    
    if (Array.isArray(settings.gigTypes)) {
      return settings.gigTypes.map(item => 
        typeof item === 'string' ? item.replace(/^["'\\[\]]+|["'\\[\]]+$/g, '').replace(/\\"/g, '').replace(/"/g, '').trim() : item
      );
    }
    
    return [];
  }, [settings.gigTypes]);

  // Parse event types from settings
  const eventTypes = useMemo(() => {
    if (settings.eventTypes) {
      try {
        const parsed = JSON.parse(settings.eventTypes);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        return settings.eventTypes.split('\n').filter(Boolean);
      } catch (error) {
        return settings.eventTypes.split('\n').filter(Boolean);
      }
    }
    return ["Wedding", "Corporate Event", "Private Party", "Birthday Party", 
            "Anniversary", "Concert", "Festival", "Charity Event", "Christmas Party", "Other"];
  }, [settings.eventTypes]);

  // Mutations
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
      setIsBookingDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to mark date as unavailable",
        variant: "destructive",
      });
    },
  });

  const createEnquiryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof enquiryFormSchema>) => {
      const enquiryData = {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : null,
      };
      
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enquiryData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] });
      setIsEnquiryDialogOpen(false);
      enquiryForm.reset();
      toast({
        title: "Success",
        description: "Enquiry created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create enquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEnquiryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/enquiries/${id}`, {
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      toast({
        title: "Success",
        description: "Enquiry deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete enquiry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToAddressBookMutation = useMutation({
    mutationFn: async (enquiry: Enquiry) => {
      const clientData: InsertClient = {
        name: enquiry.clientName,
        email: enquiry.clientEmail || "",
        phone: enquiry.clientPhone || "",
        address: "",
        notes: `Added from enquiry: ${enquiry.title}${enquiry.venue ? ` at ${enquiry.venue}` : ''}`
      };
      return apiRequest("POST", "/api/clients", clientData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Success", 
        description: "Client added to address book successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add client to address book",
        variant: "destructive",
      });
    },
  });

  const updateEnquiryStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(`/api/enquiries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "Enquiry status updated successfully!",
      });
      setRespondDialogOpen(false);
      setSelectedEnquiry(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update enquiry status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter and sort enquiries
  const filteredAndSortedEnquiries = useMemo(() => {
    let filtered = enquiries;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(enquiry =>
        enquiry.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        enquiry.eventType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        enquiry.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        enquiry.gigType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        enquiry.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(enquiry => enquiry.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "eventDate":
          if (!a.eventDate && !b.eventDate) return 0;
          if (!a.eventDate) return 1;
          if (!b.eventDate) return -1;
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        case "status":
          return a.status.localeCompare(b.status);
        case "newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [enquiries, searchQuery, statusFilter, sortBy]);

  // Format functions
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const formatTime = (timeString: string) => {
    return timeString || "Time TBC";
  };

  // Effects
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

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
      setIsEnquiryDialogOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const normalizeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    } catch (error) {
      return null;
    }
  };

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  const getBookingsForMonth = (month: Date) => {
    try {
      const monthBookings = bookings.filter((booking: Booking) => {
        if (!booking.eventDate) return false;
        const bookingDate = new Date(booking.eventDate);
        return bookingDate.getMonth() === month.getMonth() &&
               bookingDate.getFullYear() === month.getFullYear();
      });
      return monthBookings;
    } catch (error) {
      console.error("Error getting bookings for month:", error);
      return [];
    }
  };

  const renderCalendarView = () => {
    const potentialBookings = getPotentialBookings();
    
    if (calendarView === "month") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prevMonth = new Date(currentDate);
                  prevMonth.setMonth(prevMonth.getMonth() - 1);
                  setCurrentDate(prevMonth);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextMonth = new Date(currentDate);
                  nextMonth.setMonth(nextMonth.getMonth() + 1);
                  setCurrentDate(nextMonth);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExpiredEnquiries(!showExpiredEnquiries)}
            >
              {showExpiredEnquiries ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showExpiredEnquiries ? "Hide" : "Show"} Expired
            </Button>
          </div>
          
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentDate}
            onMonthChange={setCurrentDate}
            className="rounded-md border"
            components={{
              DayContent: ({ date, ...props }) => {
                const dayBookings = getBookingsForDate(date);
                const dayPotentialBookings = getPotentialBookingsForDate(date);
                
                return (
                  <div className="relative w-full h-full">
                    <div className="text-center">{date.getDate()}</div>
                    {dayBookings.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 rounded-full"></div>
                    )}
                    {dayPotentialBookings.length > 0 && (
                      <div className="absolute bottom-0.5 left-0 right-0 h-0.5 bg-purple-400 rounded-full"></div>
                    )}
                  </div>
                );
              },
            }}
          />
          
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {formatDate(selectedDate.toISOString())}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getBookingsForDate(selectedDate).map((booking: Booking) => (
                    <div key={booking.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{booking.title}</h4>
                          <p className="text-sm text-gray-600">
                            {booking.clientName} • {formatTime(booking.eventTime)}
                          </p>
                          {booking.venue && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {booking.venue}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {getPotentialBookingsForDate(selectedDate).map((booking: any) => (
                    <div key={booking.id} className={`border rounded-lg p-3 ${booking.isExpired ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{booking.title}</h4>
                          <p className="text-sm text-gray-600">
                            {booking.clientName} • {formatTime(booking.eventTime)}
                          </p>
                          {booking.venue && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {booking.venue}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {booking.isExpired && <Badge variant="secondary">Expired</Badge>}
                          <Badge className={getStatusColor(booking.status.replace('enquiry-', ''))}>
                            {booking.status.replace('enquiry-', '').replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {getBookingsForDate(selectedDate).length === 0 && getPotentialBookingsForDate(selectedDate).length === 0 && (
                    <p className="text-gray-500 text-center py-4">No bookings for this date</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }
    
    // Add other calendar view modes (week, day) here if needed
    return <div>Other calendar views coming soon...</div>;
  };

  const renderPipelineView = () => {
    return (
      <div className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search enquiries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="contract_sent">Contract Sent</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="eventDate">Event Date</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Enquiry Cards */}
        <div className="grid gap-4">
          {filteredAndSortedEnquiries.map((enquiry: Enquiry) => {
            const conflicts = detectConflicts(enquiry);
            const conflictSeverity = analyzeConflictSeverity(conflicts);
            const cardStyling = getConflictCardStyling(conflictSeverity);
            
            return (
              <Card key={enquiry.id} className={`${cardStyling} transition-all duration-200`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{enquiry.title || `${enquiry.clientName} - ${enquiry.eventType}`}</h3>
                        <Badge className={getStatusColor(enquiry.status)}>
                          {enquiry.status.replace('_', ' ')}
                        </Badge>
                        {conflicts.length > 0 && getConflictBadge(conflictSeverity)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {enquiry.clientName}
                        </div>
                        {enquiry.eventDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(enquiry.eventDate)}
                          </div>
                        )}
                        {enquiry.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {enquiry.venue}
                          </div>
                        )}
                        {enquiry.estimatedValue && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {enquiry.estimatedValue}
                          </div>
                        )}
                      </div>
                      
                      {enquiry.message && (
                        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                          {enquiry.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEnquiry(enquiry);
                          setRespondDialogOpen(true);
                        }}
                      >
                        <Reply className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteEnquiryMutation.mutate(enquiry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredAndSortedEnquiries.length === 0 && !enquiriesLoading && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No enquiries found matching your criteria.</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  if (bookingsLoading || enquiriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="lg:ml-64">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900 ml-12 md:ml-0">
                Schedule & Bookings
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === "calendar" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("calendar")}
                >
                  <CalendarIcon className="h-4 w-4" />
                  Calendar
                </Button>
                <Button
                  variant={viewMode === "pipeline" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("pipeline")}
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Pipeline
                </Button>
              </div>
              <Button
                onClick={() => setIsEnquiryDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4" />
                New Enquiry
              </Button>
              <Button
                onClick={() => setIsBookingDialogOpen(true)}
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Mark Unavailable
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {viewMode === "calendar" ? renderCalendarView() : renderPipelineView()}
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Date as Unavailable</DialogTitle>
          </DialogHeader>
          <Form {...bookingForm}>
            <form onSubmit={bookingForm.handleSubmit((data) => createBookingMutation.mutate(data))} className="space-y-4">
              <FormField
                control={bookingForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Unavailable, Personal Time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bookingForm.control}
                name="eventDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bookingForm.control}
                name="eventTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (Optional)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBookingMutation.isPending}>
                  {createBookingMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Enquiry Dialog */}
      <Dialog open={isEnquiryDialogOpen} onOpenChange={setIsEnquiryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Enquiry</DialogTitle>
          </DialogHeader>
          <Form {...enquiryForm}>
            <form onSubmit={enquiryForm.handleSubmit((data) => createEnquiryMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={enquiryForm.control}
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
                <FormField
                  control={enquiryForm.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter client email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={enquiryForm.control}
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
                  control={enquiryForm.control}
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={enquiryForm.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {eventTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={enquiryForm.control}
                  name="gigType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gig Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gig type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {gigTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={enquiryForm.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter venue name and address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={enquiryForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter enquiry details..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEnquiryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEnquiryMutation.isPending}>
                  {createEnquiryMutation.isPending ? "Creating..." : "Create Enquiry"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      {selectedEnquiry && (
        <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Respond to Enquiry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{selectedEnquiry.title || `${selectedEnquiry.clientName} - ${selectedEnquiry.eventType}`}</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Client:</strong> {selectedEnquiry.clientName}</p>
                  {selectedEnquiry.eventDate && <p><strong>Date:</strong> {formatDate(selectedEnquiry.eventDate)}</p>}
                  {selectedEnquiry.venue && <p><strong>Venue:</strong> {selectedEnquiry.venue}</p>}
                  {selectedEnquiry.message && <p><strong>Message:</strong> {selectedEnquiry.message}</p>}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => updateEnquiryStatusMutation.mutate({ id: selectedEnquiry.id, status: 'qualified' })}
                  variant="outline"
                  className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                >
                  Mark as Qualified
                </Button>
                <Button
                  onClick={() => updateEnquiryStatusMutation.mutate({ id: selectedEnquiry.id, status: 'confirmed' })}
                  variant="outline"
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  Mark as Confirmed
                </Button>
                <Button
                  onClick={() => updateEnquiryStatusMutation.mutate({ id: selectedEnquiry.id, status: 'rejected' })}
                  variant="outline"
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  Mark as Rejected
                </Button>
                <Button
                  onClick={() => addToAddressBookMutation.mutate(selectedEnquiry)}
                  variant="outline"
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add to Address Book
                </Button>
                <Link href={`/contracts?enquiry=${selectedEnquiry.id}`}>
                  <Button variant="outline" className="text-purple-600 border-purple-600 hover:bg-purple-50">
                    <FileSignature className="h-4 w-4 mr-2" />
                    Create Contract
                  </Button>
                </Link>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <MobileNav />
    </div>
  );
}