import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEnquirySchema, type Enquiry } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter, DollarSign, Clock, Calendar, User, Edit, Trash2, Reply, AlertCircle, CheckCircle, UserPlus, ArrowUpDown, ArrowUp, ArrowDown, FileSignature, Info, FileText, RefreshCw, CheckSquare, Square, ChevronDown, Zap } from "lucide-react";
import { z } from "zod";
import { insertClientSchema, type InsertClient } from "@shared/schema";
import { Link } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import BookingStatusDialog from "@/components/BookingStatusDialog";
import { BookingDetailsDialog } from "@/components/BookingDetailsDialog";
import { SendComplianceDialog } from "@/components/SendComplianceDialog";
import { ConflictResolutionDialog } from "@/components/ConflictResolutionDialog";
import BookingProgressTags from "@/components/booking-progress-tags";
import { 
  analyzeConflictSeverity, 
  getConflictCardStyling, 
  getConflictBadge, 
  parseConflictAnalysis, 
  getConflictActions, 
  formatConflictTooltip 
} from "@/utils/conflict-ui";
import { 
  getStageConfig, 
  mapOldStatusToStage, 
  executeContextualAction,
  getDisplayStatus,
  workflowStages,
  type WorkflowStage 
} from "@/utils/workflow-system";

const enquiryFormSchema = insertEnquirySchema.extend({
  eventDate: z.string().optional(),
}).omit({
  userId: true,
  title: true, // Remove title from validation since we auto-generate it
});

export default function Enquiries() {
  const [searchQuery, setSearchQuery] = useState("");

  const [sortBy, setSortBy] = useState("eventDate"); // eventDate, status, client, value
  const [sortReverse, setSortReverse] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookingStatusDialogOpen, setBookingStatusDialogOpen] = useState(false);
  const [selectedBookingForUpdate, setSelectedBookingForUpdate] = useState<any>(null);
  const [bookingDetailsDialogOpen, setBookingDetailsDialogOpen] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any>(null);
  const [complianceDialogOpen, setComplianceDialogOpen] = useState(false);
  const [selectedBookingForCompliance, setSelectedBookingForCompliance] = useState<any>(null);
  const [selectedBookings, setSelectedBookings] = useState<Set<number>>(new Set());
  const [bulkUpdateStatus, setBulkUpdateStatus] = useState<string>("");
  // Smart filtering system
  const [activeStatusFilters, setActiveStatusFilters] = useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<{from: string, to: string}>({from: '', to: ''});
  const [eventDateFilter, setEventDateFilter] = useState<string>('all'); // 'all', 'upcoming', 'past'
  const [conflictResolutionOpen, setConflictResolutionOpen] = useState(false);
  const [conflictResolutionData, setConflictResolutionData] = useState<{
    primaryBooking: any;
    conflictingBookings: any[];
    conflictSeverity: 'critical' | 'warning';
  } | null>(null);
  const [resolvedConflicts, setResolvedConflicts] = useState<Set<number>>(() => {
    // Load resolved conflicts from localStorage on page load
    const saved = localStorage.getItem('resolvedConflicts');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const { isDesktop } = useResponsive();
  const { toast } = useToast();

  // Auto-complete past bookings on page load
  const autoCompleteMutation = useMutation({
    mutationFn: () => apiRequest("/api/bookings/auto-complete", "POST"),
    onSuccess: (data) => {
      if (data.updatedCount > 0) {
        toast({
          title: "Auto-completion complete",
          description: `Marked ${data.updatedCount} past bookings as completed`,
        });
        // Refresh the bookings list
        queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      }
    },
    onError: (error) => {
      console.error("Auto-completion failed:", error);
    }
  });

  // Check URL params to auto-open form dialog or set status filter
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Handle dialog opening
    if (urlParams.get('action') === 'new') {
      setIsDialogOpen(true);
    }
    
    // Handle navigation with ID parameter
    const statusParam = urlParams.get('status');
    const idParam = urlParams.get('id');
    
    if (idParam && !statusParam) {
      // New navigation system: show all bookings when only ID is provided
      console.log('🔗 ID-only navigation detected, showing all bookings and scrolling to ID:', idParam);
      setActiveStatusFilters([]); // Show all bookings
      
      // Scroll to specific booking
      setTimeout(() => {
        const element = document.getElementById(`booking-${idParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight effect
          element.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
          element.style.borderRadius = '0.5rem';
          setTimeout(() => {
            element.style.boxShadow = '';
          }, 2000);
        }
      }, 500); // Allow time for data to load
    } else if (statusParam) {
      // Legacy navigation: filter by status
      console.log('🔗 Dashboard redirect - setting filter to:', statusParam);
      setActiveStatusFilters([statusParam]);
      
      // Optional: Scroll to specific booking if ID is provided
      if (idParam) {
        setTimeout(() => {
          const element = document.getElementById(`booking-${idParam}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500); // Allow time for data to load
      }
    }
    
    // Clean up URL parameters
    if (urlParams.get('action') === 'new' || statusParam || idParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Auto-complete past bookings on page load
  React.useEffect(() => {
    autoCompleteMutation.mutate();
  }, []);

  // Bulk operations functions
  const handleBookingSelect = (bookingId: number) => {
    setSelectedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBookings(new Set(sortedEnquiries.map(enquiry => enquiry.id)));
    } else {
      setSelectedBookings(new Set());
    }
  };

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ bookingIds, status }: { bookingIds: number[], status: string }) => {
      console.log('🔍 Starting bulk update:', { bookingIds, status });
      const responses = await Promise.all(
        bookingIds.map(async (id) => {
          console.log(`🔍 Updating booking ${id} to status: ${status}`);
          const response = await apiRequest(`/api/bookings/${id}`, {
            method: 'PATCH',
            body: { status }
          });
          console.log(`🔍 Response for booking ${id}:`, response);
          return response;
        })
      );
      console.log('🔍 All bulk update responses:', responses);
      return responses;
    },
    onSuccess: (data) => {
      console.log('🔍 Bulk update success, invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      
      // Force refetch after a short delay to ensure invalidation works
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/bookings'] });
      }, 100);
      
      toast({
        title: "Success",
        description: `${selectedBookings.size} booking${selectedBookings.size === 1 ? '' : 's'} updated successfully.`
      });
      setSelectedBookings(new Set());
      setBulkUpdateStatus("");
    },
    onError: (error) => {
      console.error('🔍 Bulk update error:', error);
      toast({
        title: "Error",
        description: "Failed to update bookings. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleBulkStatusUpdate = () => {
    if (selectedBookings.size === 0 || !bulkUpdateStatus) return;
    
    bulkUpdateMutation.mutate({
      bookingIds: Array.from(selectedBookings),
      status: bulkUpdateStatus
    });
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (bookingIds: number[]) => {
      const responses = await Promise.all(
        bookingIds.map(async (id) => {
          const response = await apiRequest(`/api/bookings/${id}`, {
            method: 'DELETE'
          });
          return response;
        })
      );
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      
      toast({
        title: "Success",
        description: `${selectedBookings.size} booking${selectedBookings.size === 1 ? '' : 's'} deleted successfully.`
      });
      setSelectedBookings(new Set());
    },
    onError: (error) => {
      console.error('Bulk delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete bookings. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleBulkDelete = () => {
    if (selectedBookings.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedBookings.size} booking${selectedBookings.size === 1 ? '' : 's'}? This action cannot be undone.`)) {
      bulkDeleteMutation.mutate(Array.from(selectedBookings));
    }
  };

  const handleConflictClick = async (primaryBooking: any) => {
    try {
      // Use already loaded enquiries data instead of making API call
      const allBookings = enquiries || [];
      
      // Find bookings that conflict with the selected booking
      const conflictingBookings = allBookings.filter((booking: any) => {
        if (booking.id === primaryBooking.id) return false;
        
        // Skip bookings without event dates
        if (!primaryBooking.eventDate || !booking.eventDate) return false;
        
        // Check if they're on the same date
        const primaryDate = new Date(primaryBooking.eventDate).toDateString();
        const bookingDate = new Date(booking.eventDate).toDateString();
        
        return primaryDate === bookingDate;
      });
      
      // Determine conflict severity based on time overlap
      const conflicts = detectConflicts(primaryBooking);
      const hasTimeOverlap = conflicts.some(conflict => conflict.hasTimeOverlap);
      const conflictSeverity = hasTimeOverlap ? 'critical' : 'warning';
      
      setConflictResolutionData({
        primaryBooking,
        conflictingBookings,
        conflictSeverity
      });
      setConflictResolutionOpen(true);
      
    } catch (error) {
      console.error('Error loading conflict data:', error);
      toast({
        title: "Error",
        description: "Failed to load conflict data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Phase 3: Read from main bookings table (renamed from bookings_new)
  const { data: enquiries = [], isLoading, error } = useQuery<Enquiry[]>({
    queryKey: ["/api/bookings"],
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["/api/templates"],
  });

  const { data: settings = {} } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Fetch confirmed bookings data for conflict detection
  const { data: bookings = [] } = useQuery({
    queryKey: ["/api/bookings/upcoming"],
  });

  // Quick status update for individual bookings
  const handleQuickStatusUpdate = (bookingId: number, status: string) => {
    updateEnquiryStatusMutation.mutate({ id: bookingId, status });
  };

  // Payment status update for individual bookings
  const handlePaymentStatusUpdate = (bookingId: number, paymentType: 'deposit' | 'full', status: boolean) => {
    paymentStatusUpdateMutation.mutate({ id: bookingId, paymentType, status });
  };

  // Contract status update for individual bookings
  const handleContractStatusUpdate = (bookingId: number, contractType: 'sent' | 'signed', status: boolean) => {
    contractStatusUpdateMutation.mutate({ id: bookingId, contractType, status });
  };

  // Handle contextual actions
  const handleContextualAction = (bookingId: number, action: string) => {
    console.log(`Executing contextual action: ${action} for booking ${bookingId}`);
    
    switch (action) {
      case 'reply_enquiry':
        updateEnquiryStatusMutation.mutate({ id: bookingId, status: 'awaiting_response' });
        break;
      case 'send_followup':
        // Just update last contacted time for now
        // In future, this could open email template
        break;
      case 'client_confirms':
        updateEnquiryStatusMutation.mutate({ id: bookingId, status: 'client_confirms' });
        break;
      case 'send_contract':
        updateEnquiryStatusMutation.mutate({ id: bookingId, status: 'contract_sent' });
        break;
      case 'mark_confirmed':
        updateEnquiryStatusMutation.mutate({ id: bookingId, status: 'confirmed' });
        break;
      case 'send_invoice':
        // Could redirect to invoice creation
        break;
      case 'mark_paid':
        paymentStatusUpdateMutation.mutate({ id: bookingId, paymentType: 'full', status: true });
        break;
      default:
        console.warn(`Unknown contextual action: ${action}`);
    }
  };

  // Toggle status filter
  const toggleStatusFilter = (status: string) => {
    setActiveStatusFilters(prev => {
      if (prev.includes(status)) {
        return prev.filter(s => s !== status);
      } else {
        return [...prev, status];
      }
    });
  };

  // Auto-completion for past date bookings
  React.useEffect(() => {
    if (enquiries.length > 0 && !bulkUpdateMutation.isPending) {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to start of today to include all of yesterday
      
      const bookingsToComplete = enquiries.filter(enquiry => {
        if (!enquiry.eventDate) return false;
        const eventDate = new Date(enquiry.eventDate);
        eventDate.setHours(0, 0, 0, 0); // Set to start of event date
        
        // Only auto-complete if event date is in the past and status is not already completed or rejected
        return eventDate < now && 
               enquiry.status !== 'completed' && 
               enquiry.status !== 'rejected';
      });

      if (bookingsToComplete.length > 0) {
        console.log(`Auto-completing ${bookingsToComplete.length} past bookings:`, bookingsToComplete.map(b => ({
          id: b.id,
          client: b.clientName,
          eventDate: b.eventDate,
          currentStatus: b.status
        })));
        
        // Auto-complete past bookings one by one to avoid bulk update issues
        bookingsToComplete.forEach(booking => {
          updateEnquiryStatusMutation.mutate({ id: booking.id, status: 'completed' });
        });
      }
    }
  }, [enquiries?.length, bulkUpdateMutation.isPending]); // Only run when enquiries count changes and not already updating

  // Form setup and mutations - moved before any conditional returns
  const form = useForm<z.infer<typeof enquiryFormSchema>>({
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
      notes: "",
      status: "new",
    },
  });

  const createEnquiryMutation = useMutation({
    mutationFn: async (data: z.infer<typeof enquiryFormSchema>) => {
      const enquiryData = {
        ...data,
        eventDate: data.eventDate ? new Date(data.eventDate).toISOString() : null,
      };
      
      // Phase 3: Create in main bookings table
      const response = await fetch("/api/bookings", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enquiries"] }); // Keep for backwards compatibility
      setIsDialogOpen(false);
      form.reset();
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
      // Phase 3: Delete from main bookings table
      const response = await apiRequest(`/api/bookings/${id}`, {
        method: 'DELETE'
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] }); // Keep for backwards compatibility
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
        address: "", // We don't have address from enquiry
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
      // Phase 3: Update in main bookings table
      const response = await apiRequest(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] }); // Keep for backwards compatibility
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "Enquiry status updated successfully!",
      });
      setRespondDialogOpen(false);
      setSelectedEnquiry(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update enquiry status",
        variant: "destructive",
      });
    },
  });

  const paymentStatusUpdateMutation = useMutation({
    mutationFn: async ({ id, paymentType, status }: { id: number; paymentType: 'deposit' | 'full'; status: boolean }) => {
      const updateData = paymentType === 'deposit' 
        ? { depositPaid: status }
        : { paidInFull: status };
      
      const response = await apiRequest(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "Payment status updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  const contractStatusUpdateMutation = useMutation({
    mutationFn: async ({ id, contractType, status }: { id: number; contractType: 'sent' | 'signed'; status: boolean }) => {
      const updateData = contractType === 'sent' 
        ? { contractSent: status }
        : { contractSigned: status };
      
      const response = await apiRequest(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/enquiries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Success",
        description: "Contract status updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contract status",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof enquiryFormSchema>) => {
    // Auto-generate title from Event Type and Client Name
    const eventTypeDisplay = eventTypes.find(type => 
      type.toLowerCase().replace(/ /g, '_') === data.eventType
    ) || data.eventType;
    
    const autoGeneratedTitle = `${eventTypeDisplay} - ${data.clientName}`;
    
    createEnquiryMutation.mutate({
      ...data,
      title: autoGeneratedTitle
    });
  };



  // Client-side conflict detection using already loaded data
  const detectConflicts = (enquiry: Enquiry) => {
    if (!enquiry.eventDate) return [];
    
    const conflicts = [];
    const enquiryDate = new Date(enquiry.eventDate);
    
    // Check against OTHER confirmed bookings (exclude current booking)
    bookings.forEach((booking: any) => {
      if (booking.eventDate && booking.id !== enquiry.id) {
        const bookingDate = new Date(booking.eventDate);
        if (isSameDay(enquiryDate, bookingDate)) {
          const hasTimeOverlap = checkTimeOverlap(enquiry, booking);
          conflicts.push({
            type: 'booking',
            id: booking.id,
            title: booking.title || 'Booking',
            eventDate: booking.eventDate,
            venue: booking.venue,
            hasTimeOverlap
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
          const hasTimeOverlap = checkTimeOverlap(enquiry, otherEnquiry);
          conflicts.push({
            type: 'enquiry',
            id: otherEnquiry.id,
            title: otherEnquiry.title || `${otherEnquiry.clientName} - ${otherEnquiry.eventType}`,
            eventDate: otherEnquiry.eventDate,
            venue: otherEnquiry.venue,
            hasTimeOverlap
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

  // Helper function to check if two bookings have overlapping times
  const checkTimeOverlap = (booking1: any, booking2: any) => {
    // If either booking is missing time information, assume they might overlap
    if (!booking1.eventTime || !booking2.eventTime) return true;
    
    // Parse times - format: "HH:MM"
    const parseTime = (timeStr: string, date: Date) => {
      if (!timeStr) return null;
      const [hours, minutes] = timeStr.split(':').map(Number);
      const dateTime = new Date(date);
      dateTime.setHours(hours, minutes, 0, 0);
      return dateTime;
    };
    
    const booking1Start = parseTime(booking1.eventTime, new Date(booking1.eventDate));
    const booking1End = parseTime(booking1.eventEndTime || "23:59", new Date(booking1.eventDate));
    const booking2Start = parseTime(booking2.eventTime, new Date(booking2.eventDate));
    const booking2End = parseTime(booking2.eventEndTime || "23:59", new Date(booking2.eventDate));
    
    // If we can't parse times, assume overlap
    if (!booking1Start || !booking1End || !booking2Start || !booking2End) return true;
    
    // Check for overlap: booking1 starts before booking2 ends AND booking2 starts before booking1 ends
    return booking1Start < booking2End && booking2Start < booking1End;
  };



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

  const getStatusColor = (status: string) => {
    const stage = mapOldStatusToStage(status);
    const config = getStageConfig(stage);
    return `${config.bgColor} ${config.color} ${config.borderColor}`;
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

  const filteredEnquiries = enquiries.filter((enquiry: Enquiry) => {
    // Search filter
    const matchesSearch = searchQuery === "" || 
      enquiry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enquiry.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enquiry.clientEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    const matchesStatus = activeStatusFilters.length === 0 || 
      activeStatusFilters.includes(mapOldStatusToStage(enquiry.status));
    
    // Payment filter
    const matchesPayment = paymentFilter === 'all' || 
      (paymentFilter === 'paid' && enquiry.paidInFull) ||
      (paymentFilter === 'unpaid' && !enquiry.paidInFull);
    
    // Event date filter
    const matchesEventDate = (() => {
      if (eventDateFilter === 'all') return true;
      if (!enquiry.eventDate) return false;
      
      const eventDate = new Date(enquiry.eventDate);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      if (eventDateFilter === 'upcoming') {
        return eventDate >= now;
      } else if (eventDateFilter === 'past') {
        return eventDate < now;
      }
      return true;
    })();
    
    return matchesSearch && matchesStatus && matchesPayment && matchesEventDate;
  });

  // Sort the filtered enquiries
  const sortedEnquiries = [...filteredEnquiries].sort((a, b) => {
    let result = 0;
    
    switch (sortBy) {
      case "eventDate":
        // Sort by event date, with upcoming events first
        if (!a.eventDate && !b.eventDate) result = 0;
        else if (!a.eventDate) result = 1; // No date goes to bottom
        else if (!b.eventDate) result = -1; // No date goes to bottom
        else result = new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        break;
      case "status":
        const statusOrder = { "new": 0, "booking_in_progress": 1, "contract_sent": 2, "confirmed": 3, "contract_received": 4, "completed": 5, "rejected": 6 };
        result = (statusOrder[a.status as keyof typeof statusOrder] || 99) - (statusOrder[b.status as keyof typeof statusOrder] || 99);
        break;
      case "client":
        // Sort alphabetically by client name
        result = a.clientName.localeCompare(b.clientName);
        break;
      case "value":
        // Sort by estimated value (highest first)
        const aValue = parseFloat(a.estimatedValue?.replace(/[£$,]/g, '') || '0');
        const bValue = parseFloat(b.estimatedValue?.replace(/[£$,]/g, '') || '0');
        result = bValue - aValue; // Highest value first
        break;
      default:
        result = 0;
    }
    
    // Apply reverse sort if enabled
    return sortReverse ? -result : result;
  });

  // Helper function to determine if response is needed
  const needsResponse = (enquiry: Enquiry): boolean => {
    // Never show response needed for final statuses
    if (enquiry.status === 'contract_received' || enquiry.status === 'completed' || enquiry.status === 'rejected') {
      return false;
    }
    
    // Check if explicitly marked as needing response
    if (enquiry.responseNeeded) return true;
    
    // Check if it's a new enquiry with no contact for over 24 hours
    if (enquiry.status === "new" && !enquiry.lastContactedAt) {
      const hoursSinceCreated = (new Date().getTime() - new Date(enquiry.createdAt!).getTime()) / (1000 * 60 * 60);
      return hoursSinceCreated > 24;
    }
    
    // Check if last contact was over 72 hours ago for in-progress enquiries
    if (enquiry.status === "booking_in_progress" && enquiry.lastContactedAt) {
      const hoursSinceContact = (new Date().getTime() - new Date(enquiry.lastContactedAt).getTime()) / (1000 * 60 * 60);
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
        <div className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white ml-12 sm:ml-0">Bookings</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 ml-12 sm:ml-0">Manage your booking lifecycle from enquiry to confirmed gig</p>
              </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Enquiry
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                New Enquiry Form
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/quick-add" className="flex items-center w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Quick Add
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Enquiry</DialogTitle>
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
                              <SelectTrigger>
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
                          <Textarea placeholder="Additional details about the enquiry..." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
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
          <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Respond to {selectedEnquiry?.clientName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Enquiry Details</h4>
                  <p className="text-sm text-gray-600">{selectedEnquiry?.title}</p>
                  <p className="text-sm text-gray-600">Email: {selectedEnquiry?.clientEmail || 'No email provided'}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedEnquiry?.clientPhone || 'No phone provided'}</p>
                  
                  {selectedEnquiry?.clientPhone && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-600">
                      💡 SMS responses will be available soon for phone enquiries
                    </div>
                  )}
                </div>

                {/* Add to Address Book Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => selectedEnquiry && addToAddressBookMutation.mutate(selectedEnquiry)}
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
                  
                  {/* Apply Now Button - Only show for Encore enquiries */}
                  {selectedEnquiry?.applyNowLink && (
                    <Button 
                      onClick={() => selectedEnquiry?.applyNowLink && window.open(selectedEnquiry.applyNowLink, '_blank')}
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
                  <Link href={`/contracts?action=new&enquiryId=${selectedEnquiry?.id}`}>
                    <Button 
                      variant="outline"
                      className="p-6 h-auto flex flex-col items-center space-y-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 w-full"
                    >
                      <FileSignature className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">Create Contract</span>
                      <span className="text-xs text-gray-500 text-center">
                        Generate contract with enquiry details
                      </span>
                    </Button>
                  </Link>
                  
                  {/* Create Invoice Button */}
                  <Link href={`/invoices?create=true&enquiryId=${selectedEnquiry?.id}`}>
                    <Button 
                      variant="outline"
                      className="p-6 h-auto flex flex-col items-center space-y-2 border-green-200 hover:border-green-300 hover:bg-green-50 w-full"
                    >
                      <FileText className="w-5 h-5 text-green-600" />
                      <span className="font-medium">Create Invoice</span>
                      <span className="text-xs text-gray-500 text-center">
                        Generate invoice with enquiry details
                      </span>
                    </Button>
                  </Link>
                  
                  {/* Mark as Confirmed Button */}
                  <Button 
                    onClick={() => selectedEnquiry && updateEnquiryStatusMutation.mutate({ 
                      id: selectedEnquiry.id, 
                      status: 'confirmed' 
                    })}
                    disabled={updateEnquiryStatusMutation.isPending}
                    variant="outline"
                    className="p-6 h-auto flex flex-col items-center space-y-2 border-green-200 hover:border-green-300 hover:bg-green-50"
                  >
                    <span className="text-lg">✅</span>
                    <span className="font-medium">Mark as Confirmed</span>
                    <span className="text-xs text-gray-500 text-center">
                      {updateEnquiryStatusMutation.isPending ? "Updating..." : "Update enquiry status to confirmed"}
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

        {/* Smart Filtering System */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(workflowStages).map(([status, config]) => {
                const count = enquiries.filter(e => mapOldStatusToStage(e.status) === status).length;
                const isActive = activeStatusFilters.includes(status);
                
                return (
                  <Button
                    key={status}
                    onClick={() => {
                      setActiveStatusFilters(prev => 
                        prev.includes(status) 
                          ? prev.filter(s => s !== status)
                          : [...prev, status]
                      );
                    }}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={`${isActive ? `${config.color} ${config.bgColor} border-current` : 'hover:bg-gray-50'}`}
                  >
                    <span className="mr-2">{config.icon}</span>
                    {config.displayName}
                    {count > 0 && (
                      <span className="ml-2 px-2 py-1 text-xs bg-white/20 rounded-full">
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
              
              {/* Clear All Filters */}
              {activeStatusFilters.length > 0 && (
                <Button
                  onClick={() => setActiveStatusFilters([])}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear All
                </Button>
              )}
            </div>
            
            {/* Secondary Filters */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by client name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto">
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={eventDateFilter} onValueChange={setEventDateFilter}>
                  <SelectTrigger className="w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 shrink-0">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eventDate">Event Date</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="client">Client Name</SelectItem>
                    <SelectItem value="value">Value</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={() => setSortReverse(!sortReverse)}
                  variant="outline"
                  size="sm"
                  className="px-3 shrink-0"
                >
                  {sortReverse ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Operations Bar */}
        {selectedBookings.size > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedBookings.size} booking{selectedBookings.size === 1 ? '' : 's'} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBookings(new Set())}
                    className="text-blue-700 border-blue-300 text-xs px-3"
                  >
                    Clear Selection
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-sm text-blue-700 shrink-0">Update to:</span>
                  <div className="flex gap-1 flex-wrap justify-center sm:justify-start">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setBulkUpdateStatus('new')}
                          variant="outline"
                          size="sm"
                          className={`w-8 h-8 p-0 text-sm ${
                            bulkUpdateStatus === 'new' 
                              ? 'bg-blue-500 text-white border-blue-500' 
                              : 'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          📧
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Set as New Enquiry</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setBulkUpdateStatus('booking_in_progress')}
                          variant="outline"
                          size="sm"
                          className={`w-8 h-8 p-0 text-sm ${
                            bulkUpdateStatus === 'booking_in_progress' 
                              ? 'bg-yellow-500 text-white border-yellow-500' 
                              : 'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          ⏳
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Set as Awaiting Response</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setBulkUpdateStatus('client_confirms')}
                          variant="outline"
                          size="sm"
                          className={`w-8 h-8 p-0 text-sm ${
                            bulkUpdateStatus === 'client_confirms' 
                              ? 'bg-orange-500 text-white border-orange-500' 
                              : 'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          👍
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Set as Client Confirms</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setBulkUpdateStatus('contract_sent')}
                          variant="outline"
                          size="sm"
                          className={`w-8 h-8 p-0 text-sm ${
                            bulkUpdateStatus === 'contract_sent' 
                              ? 'bg-purple-500 text-white border-purple-500' 
                              : 'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          📋
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Set as Contract Sent</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setBulkUpdateStatus('confirmed')}
                          variant="outline"
                          size="sm"
                          className={`w-8 h-8 p-0 text-sm ${
                            bulkUpdateStatus === 'confirmed' 
                              ? 'bg-green-500 text-white border-green-500' 
                              : 'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          ✅
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Set as Confirmed</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setBulkUpdateStatus('cancelled')}
                          variant="outline"
                          size="sm"
                          className={`w-8 h-8 p-0 text-sm ${
                            bulkUpdateStatus === 'cancelled' 
                              ? 'bg-red-500 text-white border-red-500' 
                              : 'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          ❌
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Set as Cancelled</TooltipContent>
                    </Tooltip>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setBulkUpdateStatus('completed')}
                          variant="outline"
                          size="sm"
                          className={`w-8 h-8 p-0 text-sm ${
                            bulkUpdateStatus === 'completed' 
                              ? 'bg-gray-500 text-white border-gray-500' 
                              : 'bg-gray-200 text-gray-600 border-gray-300'
                          }`}
                        >
                          🎉
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Set as Completed</TooltipContent>
                    </Tooltip>
                  </div>
                  <Button
                    onClick={handleBulkStatusUpdate}
                    disabled={!bulkUpdateStatus || bulkUpdateMutation.isPending}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-xs px-3"
                  >
                    {bulkUpdateMutation.isPending ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Update
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-xs px-3"
                  >
                    {bulkDeleteMutation.isPending ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Select All Option */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedBookings.size === sortedEnquiries.length && sortedEnquiries.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm text-gray-700 cursor-pointer">
                Select all {sortedEnquiries.length} filtered bookings
              </label>
            </div>
          </CardContent>
        </Card>



        {/* Enquiries List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedEnquiries.length === 0 ? (
            <div className="col-span-full">
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
            </div>
          ) : (
            sortedEnquiries.map((enquiry: Enquiry) => {
              const dateBox = formatDateBox(enquiry.eventDate!);
              const conflicts = detectConflicts(enquiry);
              // Enhanced conflict detection with booking status awareness
              const confirmedBookingConflicts = conflicts.filter(c => c.type === 'booking');
              const unconfirmedEnquiryConflicts = conflicts.filter(c => c.type === 'enquiry');
              
              // Check if any conflicts have time overlaps
              const hasTimeOverlap = conflicts.some(conflict => conflict.hasTimeOverlap);
              
              const conflictAnalysis = {
                hasTimeOverlap, // Now implemented with time overlap detection
                sameVenue: false, // Not implemented without Google Maps
                sameClient: false, // Could be implemented but not priority
                confirmedBooking: confirmedBookingConflicts.length > 0, // Critical: confirmed booking conflict
                unconfirmedEnquiry: unconfirmedEnquiryConflicts.length > 0, // Warning: unconfirmed enquiry conflict
                conflictCount: conflicts.length,
                conflictDetails: conflicts.length > 0 ? 
                  `${confirmedBookingConflicts.length} confirmed booking(s), ${unconfirmedEnquiryConflicts.length} unconfirmed enquiry(ies)` 
                  : 'No conflicts'
              };
              const severity = analyzeConflictSeverity(enquiry, conflictAnalysis);
              const hasConflicts = conflicts.length > 0;
              
              // Check if enquiry date is in the past
              const isPastDate = enquiry.eventDate && new Date(enquiry.eventDate) < new Date();
              
              // Status-based styling with new color scheme
              const getStatusOverlay = (status: string) => {
                const stage = mapOldStatusToStage(status);
                const config = getStageConfig(stage);
                
                switch (stage) {
                  case "new": return "bg-gradient-to-br from-blue-500/10 to-blue-500/20 border-blue-500/30"; // 🔵 Blue
                  case "awaiting_response": return "bg-gradient-to-br from-yellow-400/10 to-yellow-400/20 border-yellow-400/30"; // 🟡 Yellow
                  case "client_confirms": return "bg-gradient-to-br from-orange-500/10 to-orange-500/20 border-orange-500/30"; // 🟠 Orange
                  case "contract_sent": return "bg-gradient-to-br from-purple-500/10 to-purple-500/20 border-purple-500/30"; // 🟣 Purple
                  case "confirmed": return "bg-gradient-to-br from-green-500/10 to-green-500/20 border-green-500/30"; // 🟢 Green
                  case "cancelled": return "bg-gradient-to-br from-red-500/10 to-red-500/20 border-red-500/30"; // 🔴 Red
                  case "completed": return "bg-gradient-to-br from-gray-400/10 to-gray-400/20 border-gray-400/30"; // ⚪️ Grey
                  default: return "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200";
                }
              };
              
              const getStatusColor = (status: string) => {
                const stage = mapOldStatusToStage(status);
                const config = getStageConfig(stage);
                
                switch (stage) {
                  case "new": return "text-white bg-blue-500"; // 🔵 Blue
                  case "awaiting_response": return "text-yellow-900 bg-yellow-400"; // 🟡 Yellow
                  case "client_confirms": return "text-white bg-orange-500"; // 🟠 Orange
                  case "contract_sent": return "text-white bg-purple-500"; // 🟣 Purple
                  case "confirmed": return "text-white bg-green-500"; // 🟢 Green
                  case "cancelled": return "text-white bg-red-500"; // 🔴 Red
                  case "completed": return "text-gray-800 bg-gray-400"; // ⚪️ Grey
                  default: return "text-gray-700 bg-gray-200";
                }
              };
              
              // Conflict overlay styling
              const getConflictOverlay = () => {
                if (severity.level === 'critical') {
                  return 'border-red-500 bg-red-50 ring-2 ring-red-200';
                } else if (severity.level === 'warning') {
                  // Keep orange styling even after resolution to show "one of two bookings on same day"
                  return 'border-amber-500 bg-amber-50 ring-2 ring-amber-200';
                }
                return '';
              };

              return (
                <TooltipProvider key={enquiry.id}>
                  <Card id={`booking-${enquiry.id}`} className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${getStatusOverlay(enquiry.status)} ${isPastDate ? 'opacity-60' : ''} ${getConflictOverlay()} ${selectedBookings.has(enquiry.id) ? 'ring-2 ring-blue-400' : ''}`}
                    onDoubleClick={() => {
                      setSelectedBookingForDetails(enquiry);
                      setBookingDetailsDialogOpen(true);
                    }}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="relative">
                        {/* Critical Conflict Red Stripe */}
                        {severity.level === 'critical' && (
                          <div className="absolute inset-0 bg-red-500 opacity-20 z-10 pointer-events-none"></div>
                        )}
                        
                        {/* Warning Conflict Alert Banner */}
                        {severity.level === 'warning' && (
                          resolvedConflicts.has(enquiry.id) ? (
                            <div className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-xs font-bold px-2 py-1 z-20">
                              ⚠️ One of two bookings on same day
                            </div>
                          ) : (
                            <div 
                              className="absolute top-0 left-0 right-0 bg-amber-500 text-white text-xs font-bold px-2 py-1 z-20 cursor-pointer hover:bg-amber-600 transition-colors"
                              onClick={() => handleConflictClick(enquiry)}
                            >
                              ⚠️ POTENTIAL SCHEDULING CONFLICT - Click to resolve
                            </div>
                          )
                        )}
                        
                        {/* Critical Conflict Alert Banner */}
                        {severity.level === 'critical' && (
                          <div 
                            className="absolute top-0 left-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 z-20 cursor-pointer hover:bg-red-600 transition-colors"
                            onClick={() => handleConflictClick(enquiry)}
                          >
                            🚫 DOUBLE BOOKING RISK - Click to resolve
                          </div>
                        )}
                        {/* Selection Checkbox */}
                        <div className={`absolute ${(severity.level === 'critical' || severity.level === 'warning') ? 'top-8' : 'top-0'} left-0`}>
                          <Checkbox
                            checked={selectedBookings.has(enquiry.id)}
                            onCheckedChange={() => handleBookingSelect(enquiry.id)}
                            className="mt-1"
                          />
                        </div>
                        
                        {/* Delete Button */}
                        <div className={`absolute ${(severity.level === 'critical' || severity.level === 'warning') ? 'top-8' : 'top-0'} right-0`}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteEnquiry(enquiry)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete booking</TooltipContent>
                          </Tooltip>
                        </div>
                        
                        <div className={`pl-8 pr-8 ${(severity.level === 'critical' || severity.level === 'warning') ? 'pt-8' : ''}`}>
                          {/* Header with Price */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-lg font-bold text-green-600">
                              {enquiry.estimatedValue ? `£${enquiry.estimatedValue}` : "Price TBC"}
                            </div>
                          </div>
                        
                        {/* Date and Event Info */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`relative flex-shrink-0 w-24 h-20 border rounded-lg flex flex-col items-center justify-center p-2 ${
                            isPastDate ? 'border-gray-300 bg-gray-100' :
                            severity.level === 'critical' ? 'border-rose-300 bg-rose-50' :
                            severity.level === 'warning' ? 'border-amber-300 bg-amber-50' :
                            'border-gray-200 bg-white'
                          }`}>
                            <div className={`text-xs font-medium leading-none ${isPastDate ? 'text-gray-500' : 'text-gray-700'}`}>
                              {dateBox.dayName.slice(0, 3)}
                            </div>
                            <div className={`text-lg font-bold leading-none my-1 ${isPastDate ? 'text-gray-600' : 'text-gray-900'}`}>
                              {dateBox.dayNum}
                            </div>
                            <div className={`text-xs font-medium leading-none ${isPastDate ? 'text-gray-500' : 'text-gray-700'}`}>
                              {dateBox.monthYear}
                            </div>
                            {hasConflicts && (
                              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                                severity.level === 'critical' ? 'bg-rose-500' :
                                severity.level === 'warning' ? 'bg-amber-500' :
                                'bg-gray-500'
                              }`}></div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0 space-y-1">
                            <h3 className="text-base font-semibold text-gray-900 truncate">{enquiry.title}</h3>
                            <p className="text-sm text-gray-600 truncate">{enquiry.clientName}</p>
                            {enquiry.venue && (
                              <p className="text-sm text-gray-500 truncate">{enquiry.venue}</p>
                            )}
                            <div className="flex items-center text-sm text-gray-500 truncate">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>
                                {enquiry.eventTime && enquiry.eventEndTime 
                                  ? `${enquiry.eventTime} - ${enquiry.eventEndTime}`
                                  : '00:00 - 23:59'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Conflict and Response Indicators */}
                        <div className="flex items-center gap-2 mb-4">
                          {hasConflicts && (
                            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getConflictBadge(severity, conflicts.length)}`} title={formatConflictTooltip(severity, conflictAnalysis)}>
                              <span>{severity.icon}</span>
                              <span>{conflicts.length}</span>
                            </div>
                          )}
                          {needsResponse(enquiry) && (
                            <div className="flex items-center space-x-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                              <AlertCircle className="w-3 h-3" />
                              <span>Response needed</span>
                            </div>
                          )}
                          {enquiry.applyNowLink && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              🎯 ENCORE
                            </Badge>
                          )}
                        </div>
                        
                        {/* Action Buttons Grid - Responsive Layout */}
                        <div className="space-y-3">
                          {/* Primary Action Row */}
                          <div className="flex gap-2 justify-center flex-wrap">
                            {(() => {
                              const stage = mapOldStatusToStage(enquiry.status);
                              const config = getStageConfig(stage);
                              
                              // Get contextual actions
                              const contextualActions = config.contextualActions.map((action, index) => (
                                <Tooltip key={index}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={() => handleContextualAction(enquiry.id, action.action)}
                                      variant="default"
                                      size="sm"
                                      className={`min-w-[100px] sm:min-w-[120px] text-xs font-medium text-white transition-all duration-200 ${action.color}`}
                                    >
                                      <span className="mr-1 sm:mr-2">{action.icon}</span>
                                      <span className="hidden sm:inline">{action.label}</span>
                                      <span className="sm:hidden">{action.label.split(' ')[0]}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{action.label}</TooltipContent>
                                </Tooltip>
                              ));
                              
                              // Add Respond button to the same row for better alignment
                              const respondButton = (
                                <Tooltip key="respond">
                                  <TooltipTrigger asChild>
                                    <Button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedEnquiry(enquiry);
                                        setRespondDialogOpen(true);
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="min-w-[100px] sm:min-w-[120px] text-xs font-medium px-3 sm:px-4 py-2"
                                    >
                                      <Reply className="w-4 h-4 mr-1 sm:mr-2" />
                                      Respond
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Send email response to client</TooltipContent>
                                </Tooltip>
                              );
                              
                              return [...contextualActions, respondButton];
                            })()}
                          </div>
                          
                          {/* Status Badge Row */}
                          <div className="flex justify-center items-center">
                            <Badge className={`${getStatusColor(enquiry.status)} text-xs font-medium text-center min-h-[24px] px-3 whitespace-nowrap border`}>
                              {getDisplayStatus(enquiry.status)}
                            </Badge>
                            {enquiry.previousStatus && enquiry.status === 'completed' && (
                              <div className="text-xs text-gray-500 ml-2 hidden sm:block">
                                Was: {enquiry.previousStatus.replace('_', ' ').toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress Tags - NEW FEATURE */}
                        <div className="mt-3 border-t pt-3">
                          <BookingProgressTags booking={enquiry} size="sm" />
                        </div>
                        
                        {/* Payment Status Display */}
                        {enquiry.paidInFull && (
                          <div className="mt-3 border-t pt-3">
                            <div className="flex items-center justify-center">
                              <Badge className="bg-green-100 text-green-800 border-green-300">
                                💰 Paid in Full
                              </Badge>
                            </div>
                          </div>
                        )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TooltipProvider>
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
      
      {/* Conflict Resolution Dialog */}
      {conflictResolutionData && (
        <ConflictResolutionDialog
          open={conflictResolutionOpen}
          onOpenChange={setConflictResolutionOpen}
          primaryBooking={conflictResolutionData.primaryBooking}
          conflictingBookings={conflictResolutionData.conflictingBookings}
          conflictSeverity={conflictResolutionData.conflictSeverity}
          onResolved={() => {
            // Mark all conflicting bookings as resolved (both primary and conflicting)
            if (conflictResolutionData?.primaryBooking?.id) {
              const newResolvedConflicts = new Set(resolvedConflicts);
              
              // Add primary booking
              newResolvedConflicts.add(conflictResolutionData.primaryBooking.id);
              
              // Add all conflicting bookings
              conflictResolutionData.conflictingBookings.forEach(booking => {
                newResolvedConflicts.add(booking.id);
              });
              
              setResolvedConflicts(newResolvedConflicts);
              // Persist to localStorage
              localStorage.setItem('resolvedConflicts', JSON.stringify(Array.from(newResolvedConflicts)));
            }
            setConflictResolutionOpen(false);
            setConflictResolutionData(null);
            queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
          }}
        />
      )}
    </div>
  );
}