import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEnquirySchema, type Enquiry } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter, DollarSign, Clock, Calendar, User, Edit, Trash2, Reply, AlertCircle, CheckCircle, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, FileSignature, Info, FileText } from "lucide-react";
import { z } from "zod";
import { insertClientSchema, type InsertClient } from "@shared/schema";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import BookingStatusDialog from "@/components/BookingStatusDialog";
import { BookingDetailsDialog } from "@/components/BookingDetailsDialog";
import { SendComplianceDialog } from "@/components/SendComplianceDialog";
import { 
  analyzeConflictSeverity, 
  getConflictCardStyling, 
  getConflictBadge, 
  parseConflictAnalysis, 
  getConflictActions, 
  formatConflictTooltip 
} from "@/utils/conflict-ui";

// Note: Schema types remain as Enquiry for database compatibility
type Booking = Enquiry;

const bookingFormSchema = insertEnquirySchema.extend({
  eventDate: z.string().optional(),
}).omit({
  userId: true,
  title: true, // Remove title from validation since we auto-generate it
});

export default function Bookings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest"); // newest, oldest, eventDate, status
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookingStatusDialogOpen, setBookingStatusDialogOpen] = useState(false);
  const [selectedBookingForUpdate, setSelectedBookingForUpdate] = useState<any>(null);
  const [bookingDetailsDialogOpen, setBookingDetailsDialogOpen] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any>(null);
  const [complianceDialogOpen, setComplianceDialogOpen] = useState(false);
  const [selectedBookingForCompliance, setSelectedBookingForCompliance] = useState<any>(null);
  const { isDesktop } = useResponsive();
  const { toast } = useToast();

  // Check URL params to auto-open form dialog
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'new') {
      setIsDialogOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: bookings = [], isLoading, error } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Fetch confirmed bookings data for conflict detection
  const { data: confirmedBookings = [] } = useQuery({
    queryKey: ["/api/bookings/confirmed"],
  });

  // Client-side conflict detection using already loaded data
  const detectConflicts = (booking: Booking) => {
    if (!booking.eventDate) return [];
    
    const conflicts = [];
    const bookingDate = new Date(booking.eventDate);
    
    // Check against confirmed bookings
    confirmedBookings.forEach((confirmedBooking: any) => {
      if (confirmedBooking.eventDate) {
        const confirmedDate = new Date(confirmedBooking.eventDate);
        if (isSameDay(bookingDate, confirmedDate)) {
          conflicts.push({
            type: 'booking',
            id: confirmedBooking.id,
            title: confirmedBooking.title || 'Booking',
            eventDate: confirmedBooking.eventDate,
            venue: confirmedBooking.venue
          });
        }
      }
    });
    
    // Check against other confirmed bookings
    bookings.forEach((otherBooking: Booking) => {
      if (otherBooking.id !== booking.id && 
          otherBooking.eventDate && 
          otherBooking.status === 'confirmed') {
        const otherDate = new Date(otherBooking.eventDate);
        if (isSameDay(bookingDate, otherDate)) {
          conflicts.push({
            type: 'booking',
            id: otherBooking.id,
            title: otherBooking.title || `${otherBooking.clientName} - ${otherBooking.eventType}`,
            eventDate: otherBooking.eventDate,
            venue: otherBooking.venue
          });
        }
      }
    });
    
    return conflicts;
  };

  // Helper function to check if two dates are on the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        {isDesktop && <Sidebar />}
        <div className={`flex-1 p-4 ${isDesktop ? 'ml-64' : ''}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading bookings...</p>
            </div>
          </div>
        </div>
        {!isDesktop && <MobileNav />}
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="flex min-h-screen">
        {isDesktop && <Sidebar />}
        <div className={`flex-1 p-4 ${isDesktop ? 'ml-64' : ''}`}>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600">Error loading bookings. Please try again.</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
        {!isDesktop && <MobileNav />}
      </div>
    );
  }

  // Parse gig types from settings - handle the specific format from database
  const gigTypes = React.useMemo(() => {
    if (!settings.gigTypes) return [];
    
    // Handle string format from database
    if (typeof settings.gigTypes === 'string') {
      // Remove outer quotes and parse comma-separated values
      const cleanString = settings.gigTypes.replace(/^["']|["']$/g, '');
      if (cleanString.includes(',')) {
        return cleanString.split(',').map(item => 
          item.replace(/^["'\\[\]]+|["'\\[\]]+$/g, '').replace(/\\"/g, '').replace(/"/g, '').trim()
        ).filter(item => item.length > 0);
      }
      return [cleanString.replace(/^["'\\[\]]+|["'\\[\]]+$/g, '').replace(/\\"/g, '').replace(/"/g, '').trim()];
    }
    
    // Handle array format
    if (Array.isArray(settings.gigTypes)) {
      return settings.gigTypes.map(item => 
        typeof item === 'string' ? item.replace(/^["'\\[\]]+|["'\\[\]]+$/g, '').replace(/\\"/g, '').replace(/"/g, '').trim() : item
      );
    }
    
    return [];
  }, [settings.gigTypes]);

  // Parse event types from settings
  const eventTypes = React.useMemo(() => {
    if (settings.eventTypes) {
      try {
        // First try to parse as JSON
        const parsed = JSON.parse(settings.eventTypes);
        if (Array.isArray(parsed)) {
          return parsed;
        }
        // If not array, treat as string and split
        return settings.eventTypes.split('\n').filter(Boolean);
      } catch (error) {
        // If JSON parsing fails, treat as newline-separated string
        return settings.eventTypes.split('\n').filter(Boolean);
      }
    }
    return ["Wedding", "Corporate Event", "Private Party", "Birthday Party", 
            "Anniversary", "Concert", "Festival", "Charity Event", "Christmas Party", "Other"];
  }, [settings.eventTypes]);

  const createBookingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bookingFormSchema>) => {
      const bookingData = {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : null,
      };
      
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Booking created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/bookings/${id}`, {
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      toast({
        title: "Success",
        description: "Booking deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToAddressBookMutation = useMutation({
    mutationFn: async (booking: Booking) => {
      const clientData: InsertClient = {
        name: booking.clientName,
        email: booking.clientEmail || "",
        phone: booking.clientPhone || "",
        address: "", // We don't have address from booking
        notes: `Added from booking: ${booking.title}${booking.venue ? ` at ${booking.venue}` : ''}`
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

  const updateBookingStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "Booking status updated successfully!",
      });
      setRespondDialogOpen(false);
      setSelectedBooking(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update booking status",
        variant: "destructive",
      });
    },
  });

  const handleDeleteBooking = (booking: Booking) => {
    if (window.confirm(`Are you sure you want to delete the booking "${booking.title}"? This action cannot be undone.`)) {
      deleteBookingMutation.mutate(booking.id);
    }
  };

  const handleQuickResponse = async (templateId: number) => {
    if (!selectedBooking?.clientEmail && !selectedBooking?.clientPhone) {
      toast({
        title: "Error",
        description: "This booking has no email address or phone number to respond to.",
        variant: "destructive",
      });
      return;
    }

    const template = templates.find(t => t.id === templateId);
    
    if (template) {
      // For now, send email. SMS functionality will be added later
      if (selectedBooking?.clientEmail) {
        try {
          await fetch('/api/bookings/send-response', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: selectedBooking.id,
              to: selectedBooking.clientEmail,
              subject: template.subject,
              body: template.emailBody
            })
          });
          
          toast({
            title: "Success",
            description: "Email response sent successfully!",
          });
          
          setRespondDialogOpen(false);
          setSelectedBooking(null);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to send response. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // Future SMS functionality
        toast({
          title: "SMS Coming Soon",
          description: "SMS responses will be available soon for bookings with phone numbers.",
        });
      }
    } else {
      toast({
        title: "Error",
        description: "Template not found. Please try again.",
        variant: "destructive",
      });
    }
  };

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema),
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
      notes: "",
      status: "new",
    },
  });

  const onSubmit = (data: z.infer<typeof bookingFormSchema>) => {
    // Auto-generate title from Event Type and Client Name
    const eventTypeDisplay = eventTypes.find(type => 
      type.toLowerCase().replace(/ /g, '_') === data.eventType
    ) || data.eventType;
    
    const autoGeneratedTitle = `${eventTypeDisplay} - ${data.clientName}`;
    
    createBookingMutation.mutate({
      ...data,
      title: autoGeneratedTitle
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-gray-100 text-gray-800";
      case "booking_in_progress": return "bg-blue-100 text-blue-800";
      case "contract_sent": return "bg-purple-100 text-purple-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date set";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const formatDateBox = (dateString: string) => {
    if (!dateString) return { dayName: "TBC", dayNum: "-", monthYear: "" };
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("en-GB", { weekday: "long" });
    const dayNum = date.getDate().toString();
    const monthYear = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    return { dayName, dayNum, monthYear };
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
  };

  const formatReceivedDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredBookings = bookings.filter((booking: Booking) => {
    const matchesSearch = searchQuery === "" || 
      booking.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort the filtered bookings
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
      case "oldest":
        return new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
      case "eventDate":
        if (!a.eventDate && !b.eventDate) return 0;
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      case "status":
        const statusOrder = { "new": 0, "booking_in_progress": 1, "contract_sent": 2, "confirmed": 3, "rejected": 4 };
        return (statusOrder[a.status as keyof typeof statusOrder] || 99) - (statusOrder[b.status as keyof typeof statusOrder] || 99);
      default:
        return 0;
    }
  });

  // Helper function to determine if response is needed
  const needsResponse = (booking: Booking): boolean => {
    // Check if explicitly marked as needing response
    if (booking.responseNeeded) return true;
    
    // Check if it's a new booking with no contact for over 24 hours
    if (booking.status === "new" && !booking.lastContactedAt) {
      const hoursSinceCreated = (new Date().getTime() - new Date(booking.createdAt!).getTime()) / (1000 * 60 * 60);
      return hoursSinceCreated > 24;
    }
    
    // Check if last contact was over 72 hours ago for in-progress bookings
    if (booking.status === "booking_in_progress" && booking.lastContactedAt) {
      const hoursSinceContact = (new Date().getTime() - new Date(booking.lastContactedAt).getTime()) / (1000 * 60 * 60);
      return hoursSinceContact > 72;
    }
    
    return false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu toggle */}
      {!isDesktop && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="bg-card p-2 rounded-lg shadow-lg"
          >
            <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className={`min-h-screen ${isDesktop ? 'ml-64' : ''}`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white ml-12 md:ml-0">Bookings</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your booking lifecycle from enquiry to confirmed gig</p>
              </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Booking</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="eventType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Event Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <Input placeholder="John Smith" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john@example.com" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="clientPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="07123 456 789" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
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
                            <Input type="time" step="300" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estimatedValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Quoted (£)</FormLabel>
                          <FormControl>
                            <Input placeholder="500" {...field} value={field.value || ""} />
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
                          <Input placeholder="The Grand Hotel, London" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional details about the booking..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createBookingMutation.isPending}>
                      {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {/* Respond Dialog */}
          <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Respond to {selectedBooking?.clientName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
                  <p className="text-sm text-gray-600">{selectedBooking?.title}</p>
                  <p className="text-sm text-gray-600">Email: {selectedBooking?.clientEmail || 'No email provided'}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedBooking?.clientPhone || 'No phone provided'}</p>
                  
                  {selectedBooking?.clientPhone && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-600">
                      💡 SMS responses will be available soon for phone bookings
                    </div>
                  )}
                </div>

                {/* Add to Address Book Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => selectedBooking && addToAddressBookMutation.mutate(selectedBooking)}
                    disabled={addToAddressBookMutation.isPending}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {addToAddressBookMutation.isPending ? "Adding..." : "Add to Address Book"}
                    </span>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.filter(t => t.isAutoRespond).map((template) => (
                    <Button 
                      key={template.id}
                      onClick={() => handleQuickResponse(template.id)}
                      variant="outline"
                      className="p-6 h-auto flex flex-col items-center space-y-2"
                    >
                      <span className="text-lg">📧</span>
                      <span className="font-medium">{template.name}</span>
                      <span className="text-xs text-gray-500 text-center">{template.subject}</span>
                    </Button>
                  ))}
                  
                  {/* Apply Now Button - Only show for Encore bookings */}
                  {selectedBooking?.applyNowLink && (
                    <Button 
                      onClick={() => selectedBooking?.applyNowLink && window.open(selectedBooking.applyNowLink, '_blank')}
                      variant="outline"
                      className="p-6 h-auto flex flex-col items-center space-y-2 border-green-200 hover:border-green-300 hover:bg-green-50"
                    >
                      <span className="text-lg">🎯</span>
                      <span className="font-medium">Apply Now</span>
                      <span className="text-xs text-gray-500 text-center">
                        Apply directly on Encore platform
                      </span>
                    </Button>
                  )}
                  
                  {/* Create Contract Button */}
                  <Link href={`/contracts?action=new&bookingId=${selectedBooking?.id}`}>
                    <Button 
                      variant="outline"
                      className="p-6 h-auto flex flex-col items-center space-y-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 w-full"
                    >
                      <FileSignature className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">Create Contract</span>
                      <span className="text-xs text-gray-500 text-center">
                        Generate contract with booking details
                      </span>
                    </Button>
                  </Link>
                  
                  {/* Mark as Confirmed Button */}
                  <Button 
                    onClick={() => selectedBooking && updateBookingStatusMutation.mutate({ 
                      id: selectedBooking.id, 
                      status: 'confirmed' 
                    })}
                    disabled={updateBookingStatusMutation.isPending}
                    variant="outline"
                    className="p-6 h-auto flex flex-col items-center space-y-2 border-green-200 hover:border-green-300 hover:bg-green-50"
                  >
                    <span className="text-lg">✅</span>
                    <span className="font-medium">Mark as Confirmed</span>
                    <span className="text-xs text-gray-500 text-center">
                      {updateBookingStatusMutation.isPending ? "Updating..." : "Update booking status to confirmed"}
                    </span>
                  </Button>
                  
                  {templates.filter(t => t.isAutoRespond).length === 0 && (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500 mb-4">No auto-respond templates configured</p>
                      <Link href="/templates">
                        <Button variant="outline" size="sm">
                          Configure Templates
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search bookings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="booking_in_progress">Booking in Progress</SelectItem>
                  <SelectItem value="contract_sent">Contract Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">
                    <div className="flex items-center space-x-2">
                      <ArrowDown className="w-4 h-4" />
                      <span>Newest First</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="oldest">
                    <div className="flex items-center space-x-2">
                      <ArrowUp className="w-4 h-4" />
                      <span>Oldest First</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="eventDate">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Event Date</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="status">
                    <div className="flex items-center space-x-2">
                      <ArrowUpDown className="w-4 h-4" />
                      <span>Status</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Conflict Indicators Visual Key */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
              <h3 className="font-medium text-blue-900">Conflict Indicators</h3>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                  <span className="text-rose-800">🚫 CONFIRMED BOOKING</span>
                  <span className="text-gray-500 hidden sm:inline">- Double booking risk</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="text-amber-800">⚠️ Warning</span>
                  <span className="text-gray-500 hidden sm:inline">- Time/venue conflict</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                  <span className="text-teal-800">👤 Same Client</span>
                  <span className="text-gray-500 hidden sm:inline">- Multiple events</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-slate-500 rounded-full"></div>
                  <span className="text-slate-800">📅 Same Day</span>
                  <span className="text-gray-500 hidden sm:inline">- Check timing</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-800">✅ No Conflicts</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        <div className="space-y-4">
          {sortedBookings.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No bookings found</p>
                <p className="text-gray-400">Create your first booking to get started</p>
                <Button 
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={() => setIsDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Booking
                </Button>
              </CardContent>
            </Card>
          ) : (
            sortedBookings.map((booking: Booking) => {
              const dateBox = formatDateBox(booking.eventDate!);
              const conflicts = detectConflicts(booking);
              const conflictAnalysis = parseConflictAnalysis(booking);
              const severity = analyzeConflictSeverity(booking, conflictAnalysis);
              const hasConflicts = conflicts.length > 0;
              
              // Check if booking date is in the past
              const isPastDate = booking.eventDate && new Date(booking.eventDate) < new Date();
              
              return (
                <Card key={booking.id} className={`hover:shadow-md transition-shadow ${getConflictCardStyling(severity)} ${isPastDate ? 'opacity-60 bg-gradient-to-r from-gray-50 to-gray-100' : ''}`}>
                  <CardContent className="p-6">
                    <div className="relative">
                      <div className="absolute top-0 right-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBooking(booking)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="pr-12 flex gap-6">
                        {/* Date Box - Encore Style with Graduated Conflict Indicator */}
                        <div className={`relative flex-shrink-0 w-20 h-20 border-2 ${
                          isPastDate ? 'border-gray-300 bg-gray-200' :
                          severity.level === 'critical' ? 'border-rose-300 bg-rose-100' :
                          severity.level === 'warning' ? 'border-amber-300 bg-amber-100' :
                          severity.level === 'info' && severity.color === 'teal' ? 'border-teal-300 bg-teal-100' :
                          severity.level === 'info' ? 'border-slate-300 bg-slate-100' :
                          'border-gray-200 bg-white'
                        } rounded-lg flex flex-col items-center justify-center`}>
                          <div className={`text-xs font-medium ${isPastDate ? 'text-gray-500' : 'text-red-500'}`}>{dateBox.dayName}</div>
                          <div className={`text-2xl font-bold ${isPastDate ? 'text-gray-600' : 'text-gray-900'}`}>{dateBox.dayNum}</div>
                          <div className={`text-xs ${isPastDate ? 'text-gray-500' : 'text-gray-500'}`}>{dateBox.monthYear}</div>
                          {hasConflicts && (
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                              severity.level === 'critical' ? 'bg-rose-500' :
                              severity.level === 'warning' ? 'bg-amber-500' :
                              severity.level === 'info' && severity.color === 'teal' ? 'bg-teal-500' :
                              severity.level === 'info' ? 'bg-slate-500' :
                              'bg-gray-500'
                            }`}>
                              <span className="text-white text-xs font-bold">!</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Main Content */}
                        <div className="flex-1">
                          {/* Price and Status Row */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-2xl font-bold text-green-600">
                              {booking.estimatedValue ? `£${booking.estimatedValue}` : "Price TBC"}
                            </div>
                            <div className="flex items-center space-x-2">
                              {hasConflicts && (
                                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getConflictBadge(severity, conflicts.length)}`} title={formatConflictTooltip(severity, conflictAnalysis)}>
                                  <span>{severity.icon} {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}</span>
                                </div>
                              )}
                              {needsResponse(booking) && (
                                <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Response needed</span>
                                </div>
                              )}
                              {booking.applyNowLink && (
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                  🎯 ENCORE
                                </Badge>
                              )}
                              <Badge className={getStatusColor(booking.status)}>
                                {booking.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Event Title */}
                          <h3 className="text-xl font-semibold text-gray-900 mb-4">{booking.title}</h3>
                          
                          {/* Event Details with Icons */}
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center text-gray-600">
                              <User className="w-4 h-4 mr-2" />
                              <span className="font-medium">{booking.clientName}</span>
                              {booking.clientEmail && <span className="text-sm ml-2">• {booking.clientEmail}</span>}
                            </div>
                            
                            {booking.eventTime && (
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-2" />
                                <span>{booking.eventTime}</span>
                              </div>
                            )}
                            
                            {booking.venue && (
                              <div className="flex items-center text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>{booking.venue}</span>
                              </div>
                            )}
                            
                            {booking.gigType && (
                              <div className="flex items-center text-gray-600">
                                <DollarSign className="w-4 h-4 mr-2" />
                                <span>{booking.gigType}</span>
                              </div>
                            )}
                            
                            {/* Received Date */}
                            <div className="flex items-center text-gray-500 text-sm mt-2 pt-2 border-t border-gray-100">
                              <Clock className="w-3 h-3 mr-2" />
                              <span>Received: {formatReceivedDate(booking.createdAt!)}</span>
                            </div>
                          </div>
                          
                          {/* Notes Section */}
                          {booking.notes && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              {(() => {
                                const notes = booking.notes || '';
                                
                                // Handle both old and new format
                                let mainNotes = notes;
                                let metadata = '';
                                
                                // Check for old format with "--- Contact Details ---"
                                if (notes.includes('--- Contact Details ---')) {
                                  const sourceMatch = notes.match(/Source: ([^\n]+)/);
                                  const contactMatch = notes.match(/Contact Method: ([^\n]+)/);
                                  mainNotes = notes.replace(/\n*--- Contact Details ---[\s\S]*$/, '').trim();
                                  
                                  if (contactMatch) {
                                    metadata = `Contact Method - ${contactMatch[1]}`;
                                  }
                                }
                                // Check for new "Contact Method - Phone" format
                                else if (notes.includes('Contact Method -')) {
                                  const contactMatch = notes.match(/Contact Method - ([^\n]+)/);
                                  mainNotes = notes.replace(/\n\nContact Method -.*$/, '').trim();
                                  
                                  if (contactMatch) {
                                    metadata = `Contact Method - ${contactMatch[1]}`;
                                  }
                                }
                                // Check for simple "Source:" format without header
                                else if (notes.includes('Source:')) {
                                  const sourceMatch = notes.match(/Source: ([^\n•]+)/);
                                  const contactMatch = notes.match(/Contact: ([^\n]+)/);
                                  mainNotes = notes.replace(/\n\nSource:.*$/, '').trim();
                                  
                                  if (contactMatch) {
                                    metadata = `Contact Method - ${contactMatch[1]}`;
                                  }
                                }
                                // Check for new simple format (just "Email • Phone")
                                else {
                                  const parts = notes.split('\n\n');
                                  if (parts.length > 1) {
                                    const lastPart = parts[parts.length - 1];
                                    if (lastPart.includes('•')) {
                                      mainNotes = parts.slice(0, -1).join('\n\n').trim();
                                      metadata = lastPart;
                                    }
                                  } else if (notes.includes('•') && !notes.includes('\n')) {
                                    // If it's just metadata without main notes
                                    mainNotes = '';
                                    metadata = notes;
                                  }
                                }
                                
                                return (
                                  <div className="space-y-2">
                                    {mainNotes && (
                                      <p className="text-sm text-gray-700">{mainNotes}</p>
                                    )}
                                    {metadata && (
                                      <div className="text-xs text-gray-500 border-t pt-2">
                                        <span>{metadata}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          
                          {/* Enhanced Conflict Analysis Section */}
                          {hasConflicts && (
                            <div className={`mt-4 p-4 ${severity.bgColor} border ${severity.borderColor} rounded-lg`}>
                              <div className="flex items-center space-x-2 mb-3">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  severity.level === 'critical' ? 'bg-red-500' :
                                  severity.level === 'warning' ? 'bg-orange-500' :
                                  severity.level === 'info' ? 'bg-blue-500' :
                                  'bg-amber-500'
                                }`}>
                                  <span className="text-white text-xs font-bold">{severity.icon}</span>
                                </div>
                                <h4 className={`text-sm font-semibold ${severity.textColor}`}>
                                  {severity.message}
                                </h4>
                              </div>
                              <div className="space-y-2">
                                {conflicts.map((conflict, index) => (
                                  <div key={index} className={`flex items-center justify-between p-2 rounded border ${
                                    conflict.type === 'booking' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                                  }`}>
                                    <div className="flex items-center space-x-3">
                                      <div className={`w-3 h-3 rounded-full ${conflict.type === 'booking' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                      <div>
                                        <p className={`text-sm font-medium ${conflict.type === 'booking' ? 'text-red-900' : 'text-gray-900'}`}>
                                          {conflict.title}
                                        </p>
                                        <p className={`text-xs ${conflict.type === 'booking' ? 'text-red-600' : 'text-gray-500'}`}>
                                          {conflict.type === 'booking' ? '🚫 CONFIRMED BOOKING' : 'Booking'}
                                          {conflict.venue && ` • ${conflict.venue}`}
                                          {conflict.eventTime && ` • ${conflict.eventTime}`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className={`text-xs ${conflict.type === 'booking' ? 'text-red-600' : 'text-gray-500'}`}>
                                      {new Date(conflict.eventDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Smart Recommendation */}
                              <div className={`mt-3 p-2 rounded text-xs ${
                                severity.level === 'critical' ? 'bg-red-100 text-red-800' :
                                severity.level === 'warning' ? 'bg-orange-100 text-orange-800' :
                                severity.level === 'info' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                💡 {severity.message}
                              </div>


                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="mt-4 flex justify-end gap-2">
                            <Button
                              onClick={() => {
                                setSelectedBookingForDetails(booking);
                                setBookingDetailsDialogOpen(true);
                              }}
                              variant="outline"
                              className="border-purple-300 text-purple-600 hover:bg-purple-50"
                            >
                              <Info className="w-4 h-4 mr-2" />
                              Details
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedBookingForUpdate(booking);
                                setBookingStatusDialogOpen(true);
                              }}
                              variant="outline"
                              className="border-green-300 text-green-600 hover:bg-green-50"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Update Status
                            </Button>
                            {booking.status === 'confirmed' && (
                              <Button
                                onClick={() => {
                                  setSelectedBookingForCompliance(booking);
                                  setComplianceDialogOpen(true);
                                }}
                                variant="outline"
                                className="border-orange-300 text-orange-600 hover:bg-orange-50"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Send Compliance
                              </Button>
                            )}
                            <Button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setRespondDialogOpen(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Reply className="w-4 h-4 mr-2" />
                              Respond
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                </CardContent>
              </Card>
              );
            })
          )}
        </div>
          </div>
        </div>
      </div>

      <MobileNav />
      
      {/* Booking Status Dialog */}
      <BookingStatusDialog
        open={bookingStatusDialogOpen}
        onOpenChange={setBookingStatusDialogOpen}
        booking={selectedBookingForUpdate}
      />
      
      {/* Booking Details Dialog */}
      <BookingDetailsDialog
        open={bookingDetailsDialogOpen}
        onOpenChange={setBookingDetailsDialogOpen}
        booking={selectedBookingForDetails}
      />
      
      {/* Send Compliance Dialog */}
      {selectedBookingForCompliance && (
        <SendComplianceDialog
          booking={selectedBookingForCompliance}
          isOpen={complianceDialogOpen}
          onClose={() => {
            setComplianceDialogOpen(false);
            setSelectedBookingForCompliance(null);
          }}
        />
      )}
    </div>
  );
}  <SelectTrigger>
                                <SelectValue placeholder="Select event type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {eventTypes.map((type) => (
                                <SelectItem key={type} value={type.toLowerCase().replace(/ /g, '_')}>
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
                      control={form.control}
                      name="gigType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gig Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={gigTypes.length > 0 ? "Select gig type" : "Configure gig types in settings"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {gigTypes.length > 0 ? (
                                gigTypes.map((type: string, index: number) => (
                                  <SelectItem key={`gig-${index}`} value={type}>
                                    {type}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="not_configured" disabled>
                                  No gig types configured
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name</FormLabel>
                          <FormControl>
                            