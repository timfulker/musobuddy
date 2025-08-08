import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, List, Search, Plus, ChevronLeft, ChevronRight, Menu, Upload, Download, Clock, User, PoundSterling, Trash2, CheckSquare, Square, MoreHorizontal, FileText, Receipt, Crown, Lock, MapPin, Filter, X, ChevronDown, Settings } from "lucide-react";
import { useLocation, Link } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { useAuth } from "@/hooks/useAuth";
import { BookingDetailsDialog } from "@/components/BookingDetailsDialog";
import BookingStatusDialog from "@/components/BookingStatusDialog";
import CalendarImport from "@/components/calendar-import";
import BookingActionMenu from "@/components/booking-action-menu";
import { SendComplianceDialog } from "@/components/SendComplianceDialog";
import ConflictIndicator from "@/components/ConflictIndicator";
import ConflictResolutionDialog from "@/components/ConflictResolutionDialog";

// Import proper types from shared schema
import type { Booking } from "@shared/schema";

interface Contract {
  id: number;
  contractNumber?: string;
  clientName?: string;
  eventDate?: string;
  status?: string;
}

interface Invoice {
  id: number;
  invoiceNumber?: string;
  clientName?: string;
  amount?: number;
  status?: string;
}

interface Conflict {
  withBookingId: number;
  severity: 'hard' | 'soft';
  clientName: string;
  status: string;
  time: string;
  canEdit: boolean;
  canReject: boolean;
  type: string;
  message: string;
  overlapMinutes?: number;
}

interface ConflictGroup {
  id: string;
  date: string;
  bookings: Booking[];
  severity: 'hard' | 'soft';
}

interface ConflictResolution {
  id: number;
  bookingIds: string;
}

type ViewMode = 'list' | 'calendar';
type CalendarView = 'day' | 'week' | 'month' | 'year';

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: 'booking' | 'enquiry' | 'contract';
  status?: string;
}

interface CalendarDay {
  date: Date;
  day: number | string;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvents?: boolean;
  events: CalendarEvent[];
}

interface CalendarMonth {
  date: Date;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  bookingCount: number;
  bookings: Booking[];
}

export default function UnifiedBookings() {
  const { user } = useAuth();
  
  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Status color helper function
  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "new":
      case "enquiry":
        return "border-l-sky-400";
      case "in_progress":
      case "awaiting_response":
        return "border-l-blue-700";
      case "client_confirms":
        return "border-l-orange-500";
      case "confirmed":
        return "border-l-green-500";
      case "completed":
        return "border-l-gray-500";
      case "rejected":
      case "cancelled":
        return "border-l-red-500";
      default:
        return "border-l-gray-300";
    }
  };

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('bookingViewMode') as ViewMode) || 'calendar';
  });
  
  // Calendar state for calendar view
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  
  // Shared state
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previousStatusFilter, setPreviousStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('eventDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [conflictFilter, setConflictFilter] = useState<boolean>(false);
  
  // Dialog states
  const [bookingDetailsDialogOpen, setBookingDetailsDialogOpen] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);
  const [bookingStatusDialogOpen, setBookingStatusDialogOpen] = useState(false);
  const [selectedBookingForUpdate, setSelectedBookingForUpdate] = useState<Booking | null>(null);
  const [sendComplianceDialogOpen, setSendComplianceDialogOpen] = useState(false);
  const [selectedBookingForCompliance, setSelectedBookingForCompliance] = useState<Booking | null>(null);
  
  // Conflict resolution dialog states
  const [conflictResolutionDialogOpen, setConflictResolutionDialogOpen] = useState(false);
  const [selectedBookingForConflict, setSelectedBookingForConflict] = useState<Booking | null>(null);
  
  // Bulk selection states
  const [selectedBookings, setSelectedBookings] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkStatusChange, setBulkStatusChange] = useState<string>("");
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  
  const { isDesktop } = useResponsive();
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch data for both views
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    retry: 2,
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
    retry: 2,
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    retry: 2,
  });

  // Fetch conflicts from backend
  const { data: backendConflicts = [] } = useQuery<any[]>({
    queryKey: ["/api/conflicts"],
    retry: 2,
  });

  // Fetch conflict resolutions to check which conflicts are already resolved
  const { data: conflictResolutions = [] } = useQuery<ConflictResolution[]>({
    queryKey: ["/api/conflicts/resolutions"],
    retry: 2,
  });

  // Handle URL parameters for booking navigation from dashboard
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');
    
    if (bookingId && bookings.length > 0) {
      // Find the booking by ID
      const targetBooking = bookings.find((b) => b.id.toString() === bookingId);
      
      if (targetBooking && targetBooking.eventDate) {
        // Navigate calendar to booking's month
        const bookingDate = new Date(targetBooking.eventDate);
        setCurrentDate(bookingDate);
        
        // Switch to calendar view
        setViewMode('calendar');
        localStorage.setItem('bookingViewMode', 'calendar');
        
        // Open booking details dialog after a short delay
        setTimeout(() => {
          setSelectedBookingForDetails(targetBooking);
          setBookingDetailsDialogOpen(true);
        }, 300);
        
        // Clean up URL parameter
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [bookings]);

  // Memoized conflict detection with conflict groups
  const { conflictsByBookingId, conflictGroups } = React.useMemo(() => {
    if (!bookings || bookings.length === 0) return { conflictsByBookingId: {}, conflictGroups: [] };
    
    const conflicts: Record<number, Conflict[]> = {};
    const bookingsByDate: Record<string, Booking[]> = {};
    const groups: ConflictGroup[] = [];
    
    // Group bookings by date for efficient lookup
    bookings.forEach((booking) => {
      if (!booking.eventDate || booking.status === 'cancelled' || booking.status === 'rejected') return;
      
      const dateKey = new Date(booking.eventDate).toDateString();
      if (!bookingsByDate[dateKey]) {
        bookingsByDate[dateKey] = [];
      }
      bookingsByDate[dateKey].push(booking);
    });
    
    // Only process dates with multiple bookings and create conflict groups
    Object.entries(bookingsByDate).forEach(([dateKey, dayBookings]) => {
      if (dayBookings.length < 2) return;
      
      // Create a conflict group for this date
      const conflictGroup: ConflictGroup = {
        id: `conflict-${dateKey}`,
        date: dateKey,
        bookings: dayBookings,
        severity: 'soft'
      };
      
      let hasHardConflict = false;
      
      dayBookings.forEach((booking) => {
        const bookingConflicts = dayBookings
          .filter((other) => other.id !== booking.id && other.id && !isNaN(Number(other.id)))
          .map((other): Conflict => {
            let severity: 'soft' | 'hard' = 'soft';
            let hasTimeOverlap = false;
            let start1 = 0, end1 = 0, start2 = 0, end2 = 0; // Declare variables in outer scope
            
            // Check for time conflicts
            if (!booking.eventTime || !other.eventTime || 
                !booking.eventEndTime || !other.eventEndTime ||
                booking.eventTime === '' || other.eventTime === '' ||
                booking.eventEndTime === '' || other.eventEndTime === '' ||
                booking.eventTime === 'Time not specified' || other.eventTime === 'Time not specified') {
              severity = 'hard';
              hasTimeOverlap = false;
            } else {
              try {
                // Helper function to parse time
                const getTimeRange = (timeStr: string, endTimeStr?: string): [number, number] => {
                  const parseTime = (time: string): number => {
                    const cleanTime = time.toLowerCase().replace(/[^\d:apm]/g, '');
                    let hours = 0, minutes = 0;
                    
                    if (cleanTime.includes(':')) {
                      const [h, m] = cleanTime.split(':');
                      hours = parseInt(h, 10);
                      minutes = parseInt(m.replace(/[^0-9]/g, ''), 10) || 0;
                    } else {
                      hours = parseInt(cleanTime.replace(/[^0-9]/g, ''), 10);
                    }
                    
                    if (cleanTime.includes('pm') && hours < 12) hours += 12;
                    if (cleanTime.includes('am') && hours === 12) hours = 0;
                    
                    return hours * 60 + minutes;
                  };
                  
                  let startMinutes, endMinutes;
                  
                  if (timeStr.includes(' - ')) {
                    const [start, end] = timeStr.split(' - ');
                    startMinutes = parseTime(start);
                    endMinutes = parseTime(end);
                  } else if (endTimeStr) {
                    startMinutes = parseTime(timeStr);
                    endMinutes = parseTime(endTimeStr);
                  } else {
                    startMinutes = parseTime(timeStr);
                    endMinutes = startMinutes + 120;
                  }
                  
                  return [startMinutes, endMinutes];
                };
                
                [start1, end1] = getTimeRange(booking.eventTime, booking.eventEndTime);
                [start2, end2] = getTimeRange(other.eventTime, other.eventEndTime);
                
                hasTimeOverlap = start1 < end2 && end1 > start2;
                severity = hasTimeOverlap ? 'hard' : 'soft';
                
              } catch (error) {
                severity = 'hard';
              }
            }
            
            if (severity === 'hard') {
              hasHardConflict = true;
            }
            
            return {
              withBookingId: other.id,
              severity,
              clientName: other.clientName || 'Unknown Client',
              status: other.status || 'unknown',
              time: other.eventTime || 'Time not specified',
              canEdit: booking.status !== 'completed' && booking.status !== 'rejected' && booking.status !== 'cancelled',
              canReject: booking.status !== 'completed' && booking.status !== 'rejected' && booking.status !== 'cancelled',
              type: hasTimeOverlap ? 'time_overlap' : 'same_date',
              message: hasTimeOverlap ? 
                `Time overlap with ${other.clientName || 'Unknown Client'}` : 
                `Same date as ${other.clientName || 'Unknown Client'}`,
              overlapMinutes: hasTimeOverlap ? Math.min(end1, end2) - Math.max(start1, start2) : undefined
            };
          });
        
        if (bookingConflicts.length > 0) {
          conflicts[booking.id] = bookingConflicts;
        }
      });
      
      // Set the group severity based on whether it has hard conflicts
      conflictGroup.severity = hasHardConflict ? 'hard' : 'soft';
      groups.push(conflictGroup);
    });
    
    return { conflictsByBookingId: conflicts, conflictGroups: groups };
  }, [bookings]);

  // Filter resolved conflicts
  const filteredConflictGroups = React.useMemo(() => {
    return conflictGroups.filter(group => {
      const groupBookingIds = group.bookings.map(b => b.id).sort().join(',');
      return !conflictResolutions.some(resolution => 
        resolution.bookingIds === groupBookingIds
      );
    });
  }, [conflictGroups, conflictResolutions]);

  // Filter bookings based on search, status, and date
  const filteredBookings = React.useMemo(() => {
    let filtered = bookings;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        (booking.clientName?.toLowerCase().includes(query)) ||
        (booking.venue?.toLowerCase().includes(query)) ||
        (booking.eventType?.toLowerCase().includes(query)) ||
        (booking.title?.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(booking => {
        if (!booking.eventDate) return false;
        const bookingDate = new Date(booking.eventDate);
        const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
        
        switch (dateFilter) {
          case 'today':
            return bookingDateOnly.getTime() === today.getTime();
          case 'this_week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return bookingDateOnly >= startOfWeek && bookingDateOnly <= endOfWeek;
          case 'this_month':
            return bookingDate.getFullYear() === now.getFullYear() && 
                   bookingDate.getMonth() === now.getMonth();
          case 'upcoming':
            return bookingDateOnly >= today;
          case 'past':
            return bookingDateOnly < today;
          default:
            return true;
        }
      });
    }

    // Apply conflict filter
    if (conflictFilter) {
      filtered = filtered.filter(booking => conflictsByBookingId[booking.id]);
    }

    // Sort bookings
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof Booking];
      let bVal: any = b[sortField as keyof Booking];
      
      // Handle date sorting
      if (sortField === 'eventDate') {
        aVal = a.eventDate ? new Date(a.eventDate).getTime() : 0;
        bVal = b.eventDate ? new Date(b.eventDate).getTime() : 0;
      }
      
      // Handle string comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      // Handle numeric comparison
      if (sortField === 'fee') {
        aVal = parseFloat(String(aVal)) || 0;
        bVal = parseFloat(String(bVal)) || 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [bookings, searchQuery, statusFilter, dateFilter, conflictFilter, sortField, sortDirection, conflictsByBookingId]);

  // Generate calendar data for current month
  const calendarData = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const currentDateObj = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dateStr = currentDateObj.toDateString();
      const dayBookings = bookings.filter(booking => {
        if (!booking.eventDate) return false;
        return new Date(booking.eventDate).toDateString() === dateStr;
      });
      
      const dayEvents: CalendarEvent[] = dayBookings.map(booking => ({
        id: booking.id,
        title: booking.title || booking.clientName || 'Untitled Event',
        date: booking.eventDate ? new Date(booking.eventDate).toISOString().split('T')[0] : '',
        type: 'booking' as const,
        status: booking.status
      }));
      
      days.push({
        date: new Date(currentDateObj),
        day: currentDateObj.getDate(),
        isCurrentMonth: currentDateObj.getMonth() === month,
        isToday: currentDateObj.toDateString() === new Date().toDateString(),
        hasEvents: dayEvents.length > 0,
        events: dayEvents
      });
      
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  }, [currentDate, bookings]);

  // Generate year view data
  const yearData = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const months: CalendarMonth[] = [];
    
    for (let month = 0; month < 12; month++) {
      const monthBookings = bookings.filter(booking => {
        if (!booking.eventDate) return false;
        const bookingDate = new Date(booking.eventDate);
        return bookingDate.getFullYear() === year && bookingDate.getMonth() === month;
      });
      
      months.push({
        date: new Date(year, month, 1),
        month,
        year,
        isCurrentMonth: month === new Date().getMonth() && year === new Date().getFullYear(),
        bookingCount: monthBookings.length,
        bookings: monthBookings
      });
    }
    
    return months;
  }, [currentDate, bookings]);

  // Bulk action mutations
  const bulkDeleteMutation = useMutation({
    mutationFn: async (bookingIds: number[]) => {
      await apiRequest(`/api/bookings/bulk-delete`, {
        method: 'POST',
        body: { bookingIds }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setSelectedBookings([]);
      setShowDeleteDialog(false);
      toast({
        title: "Bookings deleted",
        description: `${selectedBookings.length} bookings have been deleted.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete bookings. Please try again.",
        variant: "destructive",
      });
    }
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ bookingIds, status }: { bookingIds: number[], status: string }) => {
      await apiRequest(`/api/bookings/bulk-status`, {
        method: 'POST',
        body: { bookingIds, status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setSelectedBookings([]);
      setShowBulkStatusDialog(false);
      setBulkStatusChange("");
      toast({
        title: "Bookings updated",
        description: `${selectedBookings.length} bookings have been updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update bookings. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Detect conflicts for a booking
  const detectConflicts = (booking: Booking) => {
    return conflictsByBookingId[booking.id] || [];
  };

  // Helper to check if booking has conflicts
  const hasConflicts = (booking: Booking) => {
    const conflicts = detectConflicts(booking);
    return conflicts.length > 0;
  };

  // Open compliance dialog
  const openComplianceDialog = (booking: Booking) => {
    setSelectedBookingForCompliance(booking);
    setSendComplianceDialogOpen(true);
  };

  // Handle edit booking
  const handleEditBooking = (booking: Booking) => {
    setSelectedBookingForDetails(booking);
    setBookingDetailsDialogOpen(true);
  };

  // Event handlers
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('bookingViewMode', mode);
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBookingForDetails(booking);
    setBookingDetailsDialogOpen(true);
  };

  const handleStatusUpdate = (booking: Booking) => {
    setSelectedBookingForUpdate(booking);
    setBookingStatusDialogOpen(true);
  };

  const handleSendCompliance = (booking: Booking) => {
    setSelectedBookingForCompliance(booking);
    setSendComplianceDialogOpen(true);
  };

  const handleConflictResolve = (booking: Booking) => {
    setSelectedBookingForConflict(booking);
    setConflictResolutionDialogOpen(true);
  };

  const handleBulkSelect = (bookingId: number, selected: boolean) => {
    if (selected) {
      setSelectedBookings(prev => [...prev, bookingId]);
    } else {
      setSelectedBookings(prev => prev.filter(id => id !== bookingId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedBookings(filteredBookings.map(b => b.id));
    } else {
      setSelectedBookings([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedBookings.length > 0) {
      bulkDeleteMutation.mutate(selectedBookings);
    }
  };

  const handleBulkStatusChange = () => {
    if (selectedBookings.length > 0 && bulkStatusChange) {
      bulkStatusMutation.mutate({ 
        bookingIds: selectedBookings, 
        status: bulkStatusChange 
      });
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Time TBD';
    return timeString;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
      case 'enquiry':
        return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'in_progress':
      case 'awaiting_response':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'client_confirms':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get status color for calendar badges  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'awaiting_response': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'contract_sent': return 'bg-primary/10 text-primary';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  // Calendar view components
  const CalendarMonthView = () => (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <Select value={calendarView} onValueChange={(value: CalendarView) => setCalendarView(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-sm font-medium text-gray-500 dark:text-gray-400 text-center">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7">
          {calendarData.map((day, index) => (
            <div 
              key={index} 
              className={`
                min-h-24 p-2 border-r border-b border-gray-200 dark:border-slate-700 
                ${!day.isCurrentMonth ? 'bg-gray-50 dark:bg-slate-900' : ''} 
                ${day.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer
              `}
              onClick={() => {
                if (day.events.length > 0) {
                  // If there are events, show the first one or allow selection
                  const firstEvent = day.events[0];
                  const booking = bookings.find(b => b.id === firstEvent.id);
                  if (booking) {
                    handleBookingClick(booking);
                  }
                }
              }}
            >
              <div className="flex justify-between items-start">
                <span className={`
                  text-sm 
                  ${!day.isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'} 
                  ${day.isToday ? 'font-semibold text-blue-600 dark:text-blue-400' : ''}
                `}>
                  {day.day}
                </span>
                {day.hasEvents && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
              
              <div className="mt-1 space-y-1">
                {day.events.slice(0, 3).map((event) => (
                  <div 
                    key={event.id} 
                    className={`
                      text-xs p-1 rounded truncate
                      ${getStatusBadgeColor(event.status || '')}
                    `}
                    title={`${event.title} - ${formatTime(bookings.find(b => b.id === event.id)?.eventTime || undefined)}`}
                  >
                    {event.title}
                  </div>
                ))}
                {day.events.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{day.events.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const CalendarYearView = () => (
    <div className="space-y-4">
      {/* Year header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={() => navigateYear('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              This Year
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigateYear('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <Select value={calendarView} onValueChange={(value: CalendarView) => setCalendarView(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="year">Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Year grid */}
      <div className="grid grid-cols-3 gap-4">
        {yearData.map((month) => (
          <Card 
            key={month.month} 
            className={`
              cursor-pointer hover:shadow-md transition-shadow
              ${month.isCurrentMonth ? 'ring-2 ring-blue-500' : ''}
            `}
            onClick={() => {
              setCurrentDate(new Date(month.year, month.month, 1));
              setCalendarView('month');
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {monthNames[month.month]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {month.bookingCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {month.bookingCount === 1 ? 'booking' : 'bookings'}
              </div>
              {month.bookings.length > 0 && (
                <div className="mt-3 space-y-1">
                  {month.bookings.slice(0, 3).map((booking) => (
                    <div 
                      key={booking.id} 
                      className="text-xs p-1 bg-gray-100 dark:bg-gray-700 rounded truncate"
                      title={booking.title || booking.clientName}
                    >
                      {booking.clientName}
                    </div>
                  ))}
                  {month.bookings.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{month.bookings.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // List view component
  const ListView = () => (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectedBookings.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Select value={bulkStatusChange} onValueChange={setBulkStatusChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enquiry">Enquiry</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="client_confirms">Client Confirms</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {bulkStatusChange && (
                <Button size="sm" onClick={handleBulkStatusChange}>
                  Update Status
                </Button>
              )}
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setSelectedBookings([])}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Select all checkbox */}
      {filteredBookings.length > 0 && (
        <div className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <Checkbox
            checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm font-medium">
            Select all ({filteredBookings.length} bookings)
          </span>
        </div>
      )}

      {/* Bookings list */}
      <div className="space-y-3">
        {filteredBookings.map((booking) => {
          const conflicts = conflictsByBookingId[booking.id] || [];
          const isSelected = selectedBookings.includes(booking.id);
          
          return (
            <Card 
              key={booking.id} 
              className={`
                ${getStatusBorderColor(booking.status || '')} border-l-4 
                ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
                hover:shadow-md transition-shadow
              `}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleBulkSelect(booking.id, !!checked)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 
                            className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                            onClick={() => handleBookingClick(booking)}
                          >
                            {booking.title || booking.clientName || 'Untitled Booking'}
                          </h3>
                          <Badge className={getStatusBadgeColor(booking.status || '')}>
                            {booking.status?.replace('_', ' ') || 'unknown'}
                          </Badge>
                          {conflicts.length > 0 && (
                            <ConflictIndicator 
                              bookingId={booking.id}
                              conflicts={conflicts}
                            />
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600 dark:text-gray-400">
                          {booking.clientName && (
                            <div className="flex items-center space-x-1">
                              <User className="w-4 h-4" />
                              <span>{booking.clientName}</span>
                            </div>
                          )}
                          {booking.eventDate && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(booking.eventDate ? new Date(booking.eventDate).toISOString().split('T')[0] : '')}</span>
                            </div>
                          )}
                          {booking.eventTime && (
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(booking.eventTime)}</span>
                            </div>
                          )}
                          {booking.venue && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-4 h-4" />
                              <span className="truncate">{booking.venue}</span>
                            </div>
                          )}
                          {booking.fee && (
                            <div className="flex items-center space-x-1">
                              <PoundSterling className="w-4 h-4" />
                              <span>£{booking.fee}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <BookingActionMenu 
                        booking={booking}
                        onEditBooking={handleEditBooking}
                        onSendCompliance={openComplianceDialog}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {filteredBookings.length === 0 && !bookingsLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No bookings found</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || conflictFilter 
                ? "Try adjusting your search or filter criteria." 
                : "Your bookings will appear here once you start receiving them."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Main component content
  const BookingsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Bookings</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">Manage your performance bookings and schedule</p>
        </div>
        {!isDesktop && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* View mode toggle */}
      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(value) => handleViewModeChange(value as ViewMode)}>
          <TabsList>
            <TabsTrigger value="calendar" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center space-x-2">
              <List className="w-4 h-4" />
              <span>List</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center space-x-2">
          <CalendarImport />
          <Link href="/new-booking">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <Input
                placeholder="Search bookings..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="enquiry">Enquiry</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="client_confirms">Client Confirms</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={conflictFilter}
                onCheckedChange={setConflictFilter}
              />
              <label className="text-sm font-medium">
                Conflicts Only
              </label>
            </div>

            {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || conflictFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDateFilter('all');
                  setConflictFilter(false);
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conflict alerts */}
      {filteredConflictGroups.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800 dark:text-orange-200">
              <Crown className="w-5 h-5" />
              <span>Booking Conflicts Detected</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredConflictGroups.slice(0, 3).map((group) => (
                <div key={group.id} className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>{formatDate(group.date)}:</strong> {group.bookings.length} bookings on same date
                  {group.severity === 'hard' && <span className="text-red-600 dark:text-red-400 ml-1">(Time conflict)</span>}
                </div>
              ))}
              {filteredConflictGroups.length > 3 && (
                <div className="text-sm text-orange-600 dark:text-orange-400">
                  +{filteredConflictGroups.length - 3} more conflicts
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      {bookingsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading bookings...</span>
        </div>
      ) : (
        <>
          {viewMode === 'calendar' && (
            <>
              {calendarView === 'month' && <CalendarMonthView />}
              {calendarView === 'year' && <CalendarYearView />}
            </>
          )}
          {viewMode === 'list' && <ListView />}
        </>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-gray-200 dark:border-slate-700 fixed left-0 top-0 h-full z-30">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>
        <div className="flex-1 ml-64 min-h-screen">
          <div className="p-6">
            <BookingsContent />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={`
        fixed left-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl z-50 
        transform transition-transform duration-300 ease-in-out md:hidden
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="p-6">
        <BookingsContent />
      </div>

      <MobileNav />

      {/* Dialogs */}
      <BookingDetailsDialog
        booking={selectedBookingForDetails as any}
        open={bookingDetailsDialogOpen}
        onOpenChange={setBookingDetailsDialogOpen}
      />

      <BookingStatusDialog
        booking={selectedBookingForUpdate as any}
        open={bookingStatusDialogOpen}
        onOpenChange={setBookingStatusDialogOpen}
      />

      {selectedBookingForCompliance && (
        <SendComplianceDialog
          booking={selectedBookingForCompliance as any}
          isOpen={sendComplianceDialogOpen}
          onClose={() => {
            setSendComplianceDialogOpen(false);
            setSelectedBookingForCompliance(null);
          }}
        />
      )}

      <ConflictResolutionDialog
        isOpen={conflictResolutionDialogOpen}
        onClose={() => setConflictResolutionDialogOpen(false)}
        conflictingBookings={selectedBookingForConflict ? [selectedBookingForConflict as any] : []}
      />

      {/* Bulk delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bookings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk status change dialog */}
      <AlertDialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Booking Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status of {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''} 
              to "{bulkStatusChange?.replace('_', ' ')}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStatusChange}>
              Update Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}