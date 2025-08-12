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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { Enquiry } from "@shared/schema";
import { validateBookingArray, safeGet, safeGetString } from "@shared/validation";

type ViewMode = 'list' | 'calendar';
type CalendarView = 'day' | 'week' | 'month' | 'year';

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: 'booking' | 'enquiry' | 'contract';
  status?: string;
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
        return "border-l-sky-400"; // Light blue
      case "in_progress":
      case "awaiting_response":
        return "border-l-blue-700"; // Dark blue
      case "client_confirms":
        return "border-l-orange-500"; // Orange
      case "confirmed":
        return "border-l-green-500"; // Green
      case "completed":
        return "border-l-gray-500"; // Grey
      case "rejected":
      case "cancelled":
        return "border-l-red-500"; // Red
      default:
        return "border-l-gray-300"; // Default light grey
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
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any>(null);
  const [bookingStatusDialogOpen, setBookingStatusDialogOpen] = useState(false);
  const [selectedBookingForUpdate, setSelectedBookingForUpdate] = useState<any>(null);
  const [sendComplianceDialogOpen, setSendComplianceDialogOpen] = useState(false);
  const [selectedBookingForCompliance, setSelectedBookingForCompliance] = useState<any>(null);
  
  // Conflict resolution dialog states
  const [conflictResolutionDialogOpen, setConflictResolutionDialogOpen] = useState(false);
  const [selectedBookingForConflict, setSelectedBookingForConflict] = useState<any>(null);
  
  // Bulk selection states
  const [selectedBookings, setSelectedBookings] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkStatusChange, setBulkStatusChange] = useState<string>("");
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  
  const { isDesktop } = useResponsive();
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch data for both views
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    retry: 2,
  }) as { data: Enquiry[], isLoading: boolean };

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    retry: 2,
  });



  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
    retry: 2,
  });

  // Fetch conflicts from backend
  const { data: backendConflicts = [] } = useQuery({
    queryKey: ["/api/conflicts"],
    retry: 2,
  }) as { data: any[], error?: any };

  // Fetch conflict resolutions to check which conflicts are already resolved
  const { data: conflictResolutions = [] } = useQuery({
    queryKey: ["/api/conflicts/resolutions"],
    retry: 2,
  });

  // Backend conflicts loaded

  // Handle URL parameters for booking navigation from dashboard
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');
    
    if (bookingId && bookings.length > 0) {
      // Find the booking by ID
      const validBookings = validateBookingArray(bookings) ? bookings : [];
      const targetBooking = validBookings.find((b) => b.id.toString() === bookingId);
      
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
  }, [bookings]); // Depend on bookings data

  // OPTIMIZED: Memoized conflict detection with conflict groups to prevent excessive re-computation
  const { conflictsByBookingId, conflictGroups } = React.useMemo(() => {
    if (!bookings || bookings.length === 0) return { conflictsByBookingId: {}, conflictGroups: [] };
    
    const conflicts: Record<number, any[]> = {};
    const bookingsByDate: Record<string, any[]> = {};
    const groups: any[] = [];
    
    // Group bookings by date for efficient lookup
    const validBookings = validateBookingArray(bookings) ? bookings : [];
    validBookings.forEach((booking) => {
      if (!booking.eventDate || booking.status === 'cancelled' || booking.status === 'rejected') return;
      
      const dateKey = new Date(booking.eventDate).toDateString();
      if (!bookingsByDate[dateKey]) {
        bookingsByDate[dateKey] = [];
      }
      bookingsByDate[dateKey].push(booking);
    });
    
    // Only process dates with multiple bookings and create conflict groups
    Object.entries(bookingsByDate).forEach(([dateKey, dayBookings]) => {
      if (dayBookings.length < 2) return; // No conflicts possible
      
      // Create a conflict group for this date
      const conflictGroup = {
        id: `conflict-${dateKey}`,
        date: dateKey,
        bookings: dayBookings,
        severity: 'soft' // Will be updated based on individual conflicts
      };
      
      let hasHardConflict = false;
      
      dayBookings.forEach((booking: any) => {
        const bookingConflicts = dayBookings
          .filter((other: any) => other.id !== booking.id)
          .map((other: any) => {
            let severity = 'soft'; // Default to soft conflict for same day
            let hasTimeOverlap = false;
            
            // CRITICAL FIX: Incomplete time info = Hard conflicts (red) because overlap cannot be determined
            // Must have BOTH start and end times to properly assess conflicts
            if (!booking.eventTime || !other.eventTime || 
                !booking.eventEndTime || !other.eventEndTime ||
                booking.eventTime === '' || other.eventTime === '' ||
                booking.eventEndTime === '' || other.eventEndTime === '' ||
                booking.eventTime === 'Time not specified' || other.eventTime === 'Time not specified') {
              // If either booking lacks complete time info, it's a hard conflict
              severity = 'hard';
              hasTimeOverlap = false; // Not a time overlap, but still hard conflict
            } else {
              // Both bookings have times - check for actual overlap
              try {
                // Helper function to get start and end times
                const getTimeRange = (timeStr: string, endTimeStr?: string): [number, number] => {
                  const parseTime = (time: string): number => {
                    // Handle various time formats: "20:00", "8pm", "8:00 PM", etc.
                    const cleanTime = time.toLowerCase().replace(/[^\d:apm]/g, '');
                    let hours = 0, minutes = 0;
                    
                    if (cleanTime.includes(':')) {
                      const [h, m] = cleanTime.split(':');
                      hours = parseInt(h, 10);
                      minutes = parseInt(m.replace(/[^0-9]/g, ''), 10) || 0;
                    } else {
                      hours = parseInt(cleanTime.replace(/[^0-9]/g, ''), 10);
                    }
                    
                    // Handle PM/AM
                    if (cleanTime.includes('pm') && hours < 12) hours += 12;
                    if (cleanTime.includes('am') && hours === 12) hours = 0;
                    
                    return hours * 60 + minutes;
                  };
                  
                  let startMinutes, endMinutes;
                  
                  if (timeStr.includes(' - ')) {
                    // Format: "20:00 - 22:00"
                    const [start, end] = timeStr.split(' - ');
                    startMinutes = parseTime(start);
                    endMinutes = parseTime(end);
                  } else if (endTimeStr) {
                    // Separate start and end time fields
                    startMinutes = parseTime(timeStr);
                    endMinutes = parseTime(endTimeStr);
                  } else {
                    // Only start time given - assume 2 hour duration
                    startMinutes = parseTime(timeStr);
                    endMinutes = startMinutes + 120; // Default 2 hour duration
                  }
                  
                  return [startMinutes, endMinutes];
                };
                
                const [start1, end1] = getTimeRange(booking.eventTime, booking.eventEndTime);
                const [start2, end2] = getTimeRange(other.eventTime, other.eventEndTime);
                
                // Proper overlap detection: start1 < end2 && end1 > start2
                hasTimeOverlap = start1 < end2 && end1 > start2;
                severity = hasTimeOverlap ? 'hard' : 'soft';
                
              } catch (error) {
                // Parsing failed - treat as hard conflict for safety
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
              status: other.status || 'new',
              time: other.eventTime || 'Time not specified',
              canEdit: true,
              canReject: true,
              type: 'same_day',
              message: hasTimeOverlap 
                ? `Time overlap with ${other.clientName} (${other.eventTime})`
                : `Same day booking with ${other.clientName} (${other.eventTime})`,
              overlapMinutes: hasTimeOverlap ? 60 : undefined
            };
          });
        
        conflicts[booking.id] = bookingConflicts;
      });
      
      // Update conflict group severity
      conflictGroup.severity = hasHardConflict ? 'hard' : 'soft';
      groups.push(conflictGroup);
    });
    
    return { conflictsByBookingId: conflicts, conflictGroups: groups };
  }, [bookings]);

  // OPTIMIZED: Simple conflict lookup instead of complex computation
  const detectConflicts = (booking: any) => {
    return conflictsByBookingId[booking.id] || [];
  };

  // Find if this booking is the first in its conflict group (to show single resolve button)
  const isFirstInConflictGroup = (booking: any) => {
    const conflicts = detectConflicts(booking);
    if (conflicts.length === 0) return false;
    
    // Find the conflict group for this booking's date
    const bookingDate = new Date(booking.eventDate).toDateString();
    const conflictGroup = conflictGroups.find(group => group.date === bookingDate);
    if (!conflictGroup) return false;
    
    // Return true if this is the first booking in the group (sorted by ID)
    const sortedBookings = conflictGroup.bookings.sort((a: any, b: any) => a.id - b.id);
    return sortedBookings[0].id === booking.id;
  };

  // Function to open compliance dialog from booking action menu
  const openComplianceDialog = (booking: any) => {
    setSelectedBookingForCompliance(booking);
    setSendComplianceDialogOpen(true);
  };
  
  // Enhanced sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Enhanced filtering and sorting
  const filteredAndSortedBookings = React.useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) return [];

    const validBookings = validateBookingArray(bookings) ? bookings : [];
    let filtered = validBookings.filter((booking) => {
      // Enhanced search - includes more fields
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        booking.clientName?.toLowerCase().includes(searchLower) ||
        booking.clientEmail?.toLowerCase().includes(searchLower) ||
        booking.venue?.toLowerCase().includes(searchLower) ||
        booking.eventType?.toLowerCase().includes(searchLower) ||
        booking.equipmentRequirements?.toLowerCase().includes(searchLower) ||
        booking.specialRequirements?.toLowerCase().includes(searchLower) ||
        booking.fee?.toString().includes(searchLower) ||
        booking.id?.toString().includes(searchLower);
      
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
      
      // Date filtering
      let matchesDate = true;
      if (dateFilter !== 'all' && booking.eventDate) {
        const eventDate = new Date(booking.eventDate);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (dateFilter) {
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayEnd = new Date(yesterday);
            yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);
            matchesDate = eventDate >= yesterday && eventDate < yesterdayEnd;
            break;
          case 'today':
            const todayEnd = new Date(today);
            todayEnd.setDate(todayEnd.getDate() + 1);
            matchesDate = eventDate >= today && eventDate < todayEnd;
            break;
          case 'last7days':
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            matchesDate = eventDate >= sevenDaysAgo && eventDate <= today;
            break;
          case 'week':
            const weekEnd = new Date(today);
            weekEnd.setDate(weekEnd.getDate() + 7);
            matchesDate = eventDate >= today && eventDate < weekEnd;
            break;
          case 'month':
            const monthEnd = new Date(today);
            monthEnd.setMonth(monthEnd.getMonth() + 1);
            matchesDate = eventDate >= today && eventDate < monthEnd;
            break;
          case 'past':
            matchesDate = eventDate < today;
            break;
          case 'upcoming':
            matchesDate = eventDate >= today;
            break;
        }
      }
      
      // Conflict filtering
      let matchesConflict = true;
      if (conflictFilter) {
        const conflicts = detectConflicts(booking);
        matchesConflict = conflicts.length > 0;
      }
      
      return matchesSearch && matchesStatus && matchesDate && matchesConflict;
    });

    // Sort the filtered results
    filtered.sort((a: any, b: any) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle different data types
      if (sortField === 'eventDate' || sortField === 'createdAt') {
        aValue = aValue ? new Date(aValue) : new Date(0);
        bValue = bValue ? new Date(bValue) : new Date(0);
      } else if (sortField === 'fee') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      } else if (typeof aValue === 'string') {
        aValue = aValue?.toLowerCase() || '';
        bValue = bValue?.toLowerCase() || '';
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [bookings, searchQuery, statusFilter, dateFilter, conflictFilter, sortField, sortDirection]);

  const toggleSelectAll = () => {
    const isAllSelected = filteredAndSortedBookings.length > 0 && selectedBookings.length === filteredAndSortedBookings.length;
    
    if (isAllSelected) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(filteredAndSortedBookings.map((b: any) => b.id));
    }
  };
  
  const toggleSelectBooking = (bookingId: number) => {
    setSelectedBookings(prev => 
      prev.includes(bookingId) 
        ? prev.filter(id => id !== bookingId)
        : [...prev, bookingId]
    );
  };
  
  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (bookingIds: number[]) => {
      const promises = bookingIds.map(id => 
        apiRequest(`/api/bookings/${id}`, { method: 'DELETE' })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setSelectedBookings([]);
      setShowDeleteDialog(false);
      toast({
        title: "Success",
        description: `${selectedBookings.length} booking(s) deleted successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete bookings",
        variant: "destructive",
      });
    },
  });
  
  // Bulk status change mutation
  const statusChangeMutation = useMutation({
    mutationFn: async ({ bookingIds, status }: { bookingIds: number[], status: string }) => {
      const promises = bookingIds.map(id => 
        apiRequest(`/api/bookings/${id}`, { 
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setSelectedBookings([]);
      setShowBulkStatusDialog(false);
      setBulkStatusChange("");
      toast({
        title: "Success",
        description: `${selectedBookings.length} booking(s) status updated successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    },
  });
  
  const handleBulkDelete = () => {
    if (selectedBookings.length > 0) {
      setShowDeleteDialog(true);
    }
  };
  
  const handleBulkStatusChange = (status: string) => {
    setBulkStatusChange(status);
    setShowBulkStatusDialog(true);
  };
  
  const confirmBulkDelete = () => {
    deleteMutation.mutate(selectedBookings);
  };
  
  const confirmBulkStatusChange = () => {
    if (bulkStatusChange && selectedBookings.length > 0) {
      statusChangeMutation.mutate({ bookingIds: selectedBookings, status: bulkStatusChange });
    }
  };
  
  // Toggle view mode and persist preference
  const toggleView = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('bookingViewMode', mode);
  };

  // Calendar navigation functions
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    switch (calendarView) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    switch (calendarView) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
    const events: CalendarEvent[] = [];

    const validBookings = validateBookingArray(bookings) ? bookings : [];
    validBookings.forEach((booking) => {
      if (booking.eventDate) {
        const bookingDate = new Date(booking.eventDate);
        const bookingDateStr = bookingDate.getFullYear() + '-' + 
          String(bookingDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(bookingDate.getDate()).padStart(2, '0');
        
        if (bookingDateStr === dateStr) {
          events.push({
            id: booking.id,
            title: booking.title || booking.clientName || 'Booking',
            date: dateStr,
            type: 'booking',
            status: booking.status
          });
        }
      }
    });

    return events;
  };

  // Get status color
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



  // Generate calendar data based on view type
  const generateCalendarData = () => {
    switch (calendarView) {
      case 'day':
        return generateDayView();
      case 'week':
        return generateWeekView();
      case 'month':
        return generateMonthView();
      case 'year':
        return generateYearView();
      default:
        return generateMonthView();
    }
  };

  // Generate day view
  const generateDayView = () => {
    const date = new Date(currentDate);
    const isToday = date.toDateString() === new Date().toDateString();
    const events = getEventsForDate(date);
    
    return [{
      date,
      day: date.getDate(),
      isCurrentMonth: true,
      isToday,
      hasEvents: events.length > 0,
      events
    }];
  };

  // Generate week view
  const generateWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const days = [];
    const currentDateCopy = new Date(startOfWeek);

    for (let i = 0; i < 7; i++) {
      const date = new Date(currentDateCopy);
      const isToday = date.toDateString() === new Date().toDateString();
      const events = getEventsForDate(date);

      days.push({
        date,
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday,
        hasEvents: events.length > 0,
        events
      });

      currentDateCopy.setDate(currentDateCopy.getDate() + 1);
    }

    return days;
  };

  // Generate month view (existing logic)
  const generateMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    // Start from Monday of the first week
    const firstDayOfWeek = firstDay.getDay();
    const daysToSubtract = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const days = [];
    const currentDateCopy = new Date(startDate);

    // Generate 6 weeks (42 days)
    for (let i = 0; i < 42; i++) {
      const date = new Date(currentDateCopy);
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === new Date().toDateString();
      const events = getEventsForDate(date);
      const hasEvents = events.length > 0;

      days.push({
        date,
        day: date.getDate(),
        isCurrentMonth,
        isToday,
        hasEvents,
        events
      });

      currentDateCopy.setDate(currentDateCopy.getDate() + 1);
    }

    return days;
  };

  // Generate year view
  const generateYearView = () => {
    const year = currentDate.getFullYear();
    const months = [];
    
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(year, month, 1);
      const validBookings = validateBookingArray(bookings) ? bookings : [];
      const monthBookings = validBookings.filter((booking) => {
        if (!booking.eventDate) return false;
        const bookingDate = new Date(booking.eventDate);
        return bookingDate.getFullYear() === year && bookingDate.getMonth() === month;
      });
      
      months.push({
        date: monthDate,
        month: monthDate.getMonth(),
        year: monthDate.getFullYear(),
        isCurrentMonth: month === new Date().getMonth() && year === new Date().getFullYear(),
        bookingCount: monthBookings.length,
        bookings: monthBookings
      });
    }
    
    return months;
  };

  const handleDateClick = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      const firstEvent = events[0];
      const validBookings = validateBookingArray(bookings) ? bookings : [];
      const booking = validBookings.find((b) => b.id === firstEvent.id);
      if (booking) {
        setSelectedBookingForDetails(booking);
        setBookingDetailsDialogOpen(true);
      }
    }
  };

  const handleBookingClick = (booking: any) => {
    setSelectedBookingForDetails(booking);
    setBookingDetailsDialogOpen(true);
  };

  // Handler for editing booking from conflict resolution dialog
  const handleEditBookingFromConflict = (booking: any) => {
    console.log('handleEditBookingFromConflict called with booking:', booking);
    setSelectedBookingForDetails(booking);
    setBookingDetailsDialogOpen(true);
  };

  // Handler for editing booking from action menu
  const handleEditBooking = (booking: any) => {
    setSelectedBookingForDetails(booking);
    setBookingDetailsDialogOpen(true);
  };

  // Get calendar data for the current view
  const calendarData = generateCalendarData();

  return (
    <div className="min-h-screen bg-background layout-consistent">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content - Viewport Height Container */}
      <div className={`h-screen flex flex-col transition-all duration-300 ${isDesktop ? "ml-64" : ""}`}>
        {/* Mobile Header */}
        {!isDesktop && (
          <div className="lg:hidden border-b bg-white px-4 py-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold">Bookings</h1>
            </div>
          </div>
        )}

        {/* Fixed Header Area */}
        <div className="bg-white border-b flex-shrink-0">
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h1 className={`text-3xl font-bold ${isDesktop ? "" : "hidden lg:block"}`}>
                  Bookings
                </h1>
                
                {/* View Toggle */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => toggleView('list')}
                      className="rounded-md"
                    >
                      <List className="w-4 h-4 mr-2" />
                      List
                    </Button>
                    <Button
                      variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => toggleView('calendar')}
                      className="rounded-md"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Calendar
                    </Button>
                  </div>
                  
                  <Link href="/new-booking">
                    <Button className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      New Booking
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Enhanced Filters */}
              <div className="space-y-4">
                {/* Search and Main Filters Row */}
                <div className="flex flex-wrap gap-4">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by client, venue, event type, fee, booking ID..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <Select 
                    value={statusFilter} 
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      if (!conflictFilter) {
                        setPreviousStatusFilter(value);
                      }
                    }}
                    disabled={conflictFilter}
                  >
                    <SelectTrigger className={`w-48 ${conflictFilter ? 'opacity-50' : ''}`}>
                      <SelectValue placeholder={conflictFilter ? "All Status (Conflict Mode)" : "Filter by status"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="client_confirms">Client Confirms</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="last7days">Last 7 Days</SelectItem>
                      <SelectItem value="week">Next 7 Days</SelectItem>
                      <SelectItem value="month">Next 30 Days</SelectItem>
                      <SelectItem value="upcoming">All Upcoming</SelectItem>
                      <SelectItem value="past">Past Events</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Conflict Filter Toggle */}
                  <div className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2">
                    <Switch
                      id="conflict-filter"
                      checked={conflictFilter}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Save current status filter before switching to conflicts
                          setPreviousStatusFilter(statusFilter);
                          setStatusFilter('all');
                        } else {
                          // Restore previous status filter when disabling conflicts
                          setStatusFilter(previousStatusFilter);
                        }
                        setConflictFilter(checked);
                      }}
                      className="data-[state=checked]:bg-red-500"
                    />
                    <label 
                      htmlFor="conflict-filter" 
                      className="text-sm font-medium cursor-pointer"
                    >
                      Show Conflicts Only
                    </label>
                    {conflictFilter && (
                      <Badge variant="destructive" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Sort Controls Row - Only show in list view */}
                {viewMode === 'list' && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-medium text-gray-700">Sort by:</span>
                    <div className="flex gap-2">
                      <Button
                        variant={sortField === 'eventDate' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSort('eventDate')}
                        className="h-8"
                      >
                        Date {sortField === 'eventDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </Button>
                      <Button
                        variant={sortField === 'clientName' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSort('clientName')}
                        className="h-8"
                      >
                        Client {sortField === 'clientName' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </Button>
                      <Button
                        variant={sortField === 'fee' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSort('fee')}
                        className="h-8"
                      >
                        Fee {sortField === 'fee' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </Button>
                      <Button
                        variant={sortField === 'status' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSort('status')}
                        className="h-8"
                      >
                        Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </Button>
                      <Button
                        variant={sortField === 'venue' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSort('venue')}
                        className="h-8"
                      >
                        Venue {sortField === 'venue' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </Button>
                      <Button
                        variant={sortField === 'createdAt' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSort('createdAt')}
                        className="h-8"
                      >
                        Date Added {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Results Counter and Clear Filters */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {filteredAndSortedBookings.length} of {Array.isArray(bookings) ? bookings.length : 0} bookings
                  {searchQuery && ` matching "${searchQuery}"`}
                </div>
                {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all' || conflictFilter || sortField !== 'eventDate') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setPreviousStatusFilter('all');
                      setDateFilter('all');
                      setConflictFilter(false);
                      setSortField('eventDate');
                      setSortDirection('desc');
                    }}
                    className="h-8"
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>

              {/* Bulk Actions Toolbar - Fixed in Header */}
              {selectedBookings.length > 0 && (
                <Card className="bg-blue-50 border-blue-200 mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-blue-700">
                          {selectedBookings.length} booking(s) selected
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedBookings([])}
                        >
                          Clear Selection
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Change Status
                              <MoreHorizontal className="w-4 h-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('new')}>
                              Mark as New
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('in_progress')}>
                              Mark as In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('client_confirms')}>
                              Mark as Client Confirms
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('confirmed')}>
                              Mark as Confirmed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('completed')}>
                              Mark as Completed
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('rejected')}>
                              Mark as Rejected
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={handleBulkDelete}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Select All Header - Fixed in Header */}
              {!bookingsLoading && filteredAndSortedBookings.length > 0 && viewMode === 'list' && (
                <Card className="bg-gray-50 mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={filteredAndSortedBookings.length > 0 && selectedBookings.length === filteredAndSortedBookings.length}
                        ref={(el) => {
                          if (el && el.querySelector('input')) {
                            const isIndeterminate = selectedBookings.length > 0 && selectedBookings.length < filteredAndSortedBookings.length;
                            (el.querySelector('input') as HTMLInputElement).indeterminate = isIndeterminate;
                          }
                        }}
                        onCheckedChange={toggleSelectAll}
                      />
                      <span className="text-sm font-medium">
                        {(filteredAndSortedBookings.length > 0 && selectedBookings.length === filteredAndSortedBookings.length) ? 'Deselect All' : 'Select All'} ({filteredAndSortedBookings.length} bookings)
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Content Area - Different handling for list vs calendar */}
        <div className={`${viewMode === 'list' ? 'overflow-y-auto' : 'flex flex-col'}`} style={{ height: 'calc(100vh - 450px)' }}>
          <div className={`${viewMode === 'list' ? 'p-6' : 'p-6 flex-1 flex flex-col'}`}>
            <div className={`max-w-7xl mx-auto ${viewMode === 'list' ? 'space-y-6' : 'flex-1 flex flex-col'}`}>

            {/* Content Based on View Mode */}
            {viewMode === 'list' ? (
              /* List View with Conflict Grouping */
              <div className="space-y-4">
                
                {bookingsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading bookings...</p>
                  </div>
                ) : filteredAndSortedBookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {searchQuery || statusFilter !== 'all' || dateFilter !== 'all' ? 'No bookings match your filters' : 'No bookings found'}
                  </div>
                ) : (
                  (() => {
                    // Group bookings by conflict groups for visual grouping
                    const renderedBookings = new Set<number>();
                    const elements: JSX.Element[] = [];
                    
                    filteredAndSortedBookings.forEach((booking: any) => {
                      if (renderedBookings.has(booking.id)) return;
                      
                      const conflicts = detectConflicts(booking);
                      if (conflicts.length > 0) {
                        // This booking has conflicts - render as a group
                        const bookingDate = new Date(booking.eventDate).toDateString();
                        const conflictGroup = conflictGroups.find(group => group.date === bookingDate);
                        
                        if (conflictGroup) {
                          // Filter group bookings to only show those in current filtered list
                          const visibleGroupBookings = conflictGroup.bookings.filter((groupBooking: any) =>
                            filteredAndSortedBookings.some((filtered: any) => filtered.id === groupBooking.id)
                          );
                          
                          // Check if this conflict group is already resolved
                          const groupBookingIds = visibleGroupBookings.map((b: any) => b.id).sort((a: number, b: number) => a - b);
                          const isResolved = (conflictResolutions || []).some((resolution: any) => {
                            const resolutionBookingIds = JSON.parse(resolution.bookingIds || '[]').sort((a: number, b: number) => a - b);
                            return JSON.stringify(resolutionBookingIds) === JSON.stringify(groupBookingIds);
                          });
                          
                          if (visibleGroupBookings.length > 1) {
                            // Render conflict group container
                            elements.push(
                              <div key={`conflict-group-${bookingDate}`} className="relative">
                                {/* Conflict Group Header with Smart Resolve Button */}
                                <div className={`flex items-center justify-between mb-2 p-3 border rounded-t-lg ${
                                  isResolved 
                                    ? 'bg-green-50 border-green-200' 
                                    : conflictGroup.severity === 'hard' 
                                    ? 'bg-red-50 border-red-200' 
                                    : 'bg-orange-50 border-orange-200'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-medium ${
                                      isResolved 
                                        ? 'text-green-700' 
                                        : conflictGroup.severity === 'hard' 
                                        ? 'text-red-700' 
                                        : 'text-orange-700'
                                    }`}>
                                      {isResolved ? '✅ Resolved Conflict Group' : '⚠️ Conflict Group'} - {new Date(booking.eventDate).toLocaleDateString()}
                                    </span>
                                    <span className={`text-sm ${
                                      isResolved 
                                        ? 'text-green-600' 
                                        : conflictGroup.severity === 'hard' 
                                        ? 'text-red-600' 
                                        : 'text-orange-600'
                                    }`}>
                                      ({visibleGroupBookings.length} bookings) {conflictGroup.severity === 'soft' ? '- Soft conflict' : '- Hard conflict'}
                                    </span>
                                  </div>
                                  
                                  {/* Smart Resolution Button Logic */}
                                  {isResolved ? (
                                    <span className="px-4 py-2 bg-green-100 text-green-700 font-medium rounded-md">
                                      Resolved
                                    </span>
                                  ) : conflictGroup.severity === 'hard' ? (
                                    <button
                                      onClick={() => {
                                        setSelectedBookingForConflict(booking);
                                        setConflictResolutionDialogOpen(true);
                                      }}
                                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                                    >
                                      Edit/Reject Bookings
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedBookingForConflict(booking);
                                        setConflictResolutionDialogOpen(true);
                                      }}
                                      className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-md transition-colors"
                                    >
                                      Resolve Soft Conflict
                                    </button>
                                  )}
                                </div>
                                
                                {/* Grouped Bookings */}
                                <div className="border border-red-200 border-t-0 rounded-b-lg overflow-hidden">
                                  {visibleGroupBookings.map((groupBooking: any, index: number) => {
                                    renderedBookings.add(groupBooking.id);
                                    return (
                                      <Card 
                                        key={groupBooking.id} 
                                        className={`relative hover:shadow-md transition-shadow border-l-4 ${getStatusBorderColor(groupBooking.status)} ${
                                          selectedBookings.includes(groupBooking.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                                        } ${index < visibleGroupBookings.length - 1 ? 'border-b border-gray-200' : ''} rounded-none border-0`}
                                      >
                                        <CardContent className="p-6">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                              <Checkbox
                                                checked={selectedBookings.includes(groupBooking.id)}
                                                onCheckedChange={() => toggleSelectBooking(groupBooking.id)}
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                              <div 
                                                className="flex-1 cursor-pointer" 
                                                onClick={() => handleBookingClick(groupBooking)}
                                              >
                                                <div className="flex items-center gap-4 mb-2">
                                                <h3 className="text-lg font-semibold">
                                                  {groupBooking.eventType || 'Event'}
                                                </h3>
                                                <Badge className={getStatusColor(groupBooking.status)}>
                                                  {groupBooking.status?.replace('_', ' ') || 'New'}
                                                </Badge>
                                                {/* Conflict badge - matching dashboard style */}
                                                {detectConflicts(groupBooking).length > 0 && (
                                                  <Badge 
                                                    variant="outline" 
                                                    className={`text-xs ${
                                                      detectConflicts(groupBooking).some(c => c.severity === 'hard')
                                                        ? 'text-red-700 bg-red-50 border-red-300'
                                                        : 'text-orange-700 bg-orange-50 border-orange-300'
                                                    }`}
                                                  >
                                                    ⚠️ Conflict
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="text-sm text-gray-600 space-y-1">
                                                <div className="flex items-center gap-4">
                                                  <span className="flex items-center gap-1">
                                                    <User className="w-4 h-4" />
                                                    {groupBooking.clientName || 'Unknown Client'}
                                                  </span>
                                                  {groupBooking.venue && (
                                                    <span className="flex items-center gap-1">
                                                      <MapPin className="w-4 h-4" />
                                                      {groupBooking.venue}
                                                    </span>
                                                  )}
                                                  {groupBooking.eventTime && (
                                                    <span className="flex items-center gap-1">
                                                      <Clock className="w-4 h-4" />
                                                      {groupBooking.eventTime}
                                                    </span>
                                                  )}
                                                  {groupBooking.fee && (
                                                    <span className="flex items-center gap-1 font-medium text-green-600">
                                                      <PoundSterling className="w-4 h-4" />
                                                      {groupBooking.fee}
                                                    </span>
                                                  )}
                                                </div>
                                                <p className="text-gray-500">
                                                  {new Date(groupBooking.eventDate).toLocaleDateString('en-GB', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                  })}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                          <div className="flex items-center justify-end mt-4">
                                            <BookingActionMenu
                                              booking={groupBooking}
                                              onEditBooking={handleEditBooking}
                                              onSendCompliance={openComplianceDialog}
                                            />
                                          </div>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                            return;
                          }
                        }
                      }
                      
                      // Non-conflicting booking or single booking in group - render normally
                      renderedBookings.add(booking.id);
                      elements.push(
                        <Card 
                          key={booking.id} 
                          className={`relative hover:shadow-md transition-shadow border-l-4 ${getStatusBorderColor(booking.status)} ${
                            selectedBookings.includes(booking.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <Checkbox
                                  checked={selectedBookings.includes(booking.id)}
                                  onCheckedChange={() => toggleSelectBooking(booking.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div 
                                  className="flex-1 cursor-pointer" 
                                  onClick={() => handleBookingClick(booking)}
                                >
                                  <div className="flex items-center gap-4 mb-2">
                                  <h3 className="text-lg font-semibold">
                                    {booking.eventType || 'Event'}
                                  </h3>
                                  <Badge className={getStatusColor(booking.status)}>
                                    {booking.status?.replace('_', ' ') || 'New'}
                                  </Badge>
                                  {/* Conflict badge - matching dashboard style */}
                                  {detectConflicts(booking).length > 0 && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        detectConflicts(booking).some(c => c.severity === 'hard')
                                          ? 'text-red-700 bg-red-50 border-red-300'
                                          : 'text-orange-700 bg-orange-50 border-orange-300'
                                      }`}
                                    >
                                      ⚠️ Conflict
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                      <User className="w-4 h-4" />
                                      {booking.clientName || 'Unknown Client'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : 'No date'}
                                    </span>
                                    {booking.eventTime && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {booking.eventTime}
                                      </span>
                                    )}
                                    {booking.fee && (
                                      <span className="flex items-center gap-1">
                                        <PoundSterling className="w-4 h-4" />
                                        £{booking.fee}
                                      </span>
                                    )}
                                  </div>
                                  {booking.venue && (
                                    <div className="text-gray-500">
                                      {booking.venue}
                                    </div>
                                  )}
                                </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <BookingActionMenu
                                  booking={booking}
                                  onEditBooking={handleEditBooking}
                                  onSendCompliance={openComplianceDialog}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    });
                    
                    return elements;
                  })()
                )}
              </div>
            ) : (
              /* Calendar View - Fixed Window */
              <Card className="h-full">
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-4">
                      {/* Calendar View Toggle */}
                      <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <Button
                          variant={calendarView === 'day' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCalendarView('day')}
                          className="rounded-md text-xs"
                        >
                          Day
                        </Button>
                        <Button
                          variant={calendarView === 'week' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCalendarView('week')}
                          className="rounded-md text-xs"
                        >
                          Week
                        </Button>
                        <Button
                          variant={calendarView === 'month' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCalendarView('month')}
                          className="rounded-md text-xs"
                        >
                          Month
                        </Button>
                        <Button
                          variant={calendarView === 'year' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setCalendarView('year')}
                          className="rounded-md text-xs"
                        >
                          Year
                        </Button>
                      </div>
                      
                      {/* Date Display - Fixed Width */}
                      <div className="text-center">
                        <h2 className="text-xl font-semibold min-w-[200px]">
                          {calendarView === 'day' && currentDate.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                          {calendarView === 'week' && (() => {
                            const startOfWeek = new Date(currentDate);
                            const day = startOfWeek.getDay();
                            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                            startOfWeek.setDate(diff);
                            const endOfWeek = new Date(startOfWeek);
                            endOfWeek.setDate(startOfWeek.getDate() + 6);
                            return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                          })()}
                          {calendarView === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                          {calendarView === 'year' && currentDate.getFullYear()}
                        </h2>
                        
                        {/* Navigation Arrows - Fixed Position Below Date */}
                        <div className="flex items-center justify-center gap-4 mt-2">
                          <Button variant="outline" size="sm" onClick={goToPrevious}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setCurrentDate(new Date())}
                            className="text-xs px-3"
                          >
                            Today
                          </Button>
                          <Button variant="outline" size="sm" onClick={goToNext}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <CalendarImport />
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-full flex-1">
                  {/* Dynamic Calendar Content Based on View */}
                  {calendarView === 'day' && (
                    <div className="h-full">
                      {(() => {
                        const dayData = generateCalendarData()[0];
                        return (
                          <div className="h-full p-4 border border-gray-200 rounded-lg">
                            <div className="mb-4">
                              <h3 className="text-lg font-semibold">
                                {dayData.date.toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {dayData.events.length} event{dayData.events.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="space-y-3 overflow-y-auto" style={{ height: 'calc(100% - 80px)' }}>
                              {dayData.events.length > 0 ? (
                                dayData.events.map((event, index) => {
                                  const validBookings = validateBookingArray(bookings) ? bookings : [];
                                  const booking = validBookings.find((b) => b.id === event.id);
                                  return (
                                    <div
                                      key={index}
                                      className={`p-3 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(event.status || 'new')}`}
                                      onClick={() => {
                                        if (booking) {
                                          setSelectedBookingForDetails(booking);
                                          setBookingDetailsDialogOpen(true);
                                        }
                                      }}
                                    >
                                      <div className="font-medium">{event.title}</div>
                                      {booking && (
                                        <div className="text-sm mt-1 space-y-1">
                                          {booking.eventTime && <div>Time: {booking.eventTime}</div>}
                                          {booking.venue && <div>Venue: {booking.venue}</div>}
                                          {booking.fee && <div>Fee: £{booking.fee}</div>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center text-gray-500 py-8">
                                  No events scheduled for this day
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  
                  {calendarView === 'week' && (
                    <div className="h-full">
                      <div className="grid grid-cols-7 gap-1 h-full">
                        {/* Week Day Headers */}
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 h-10 flex items-center justify-center">
                            {day}
                          </div>
                        ))}
                        
                        {/* Week Days */}
                        {generateCalendarData().map((day, index) => (
                          <div
                            key={index}
                            className={`
                              p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 overflow-hidden
                              ${day.isCurrentMonth ? '' : 'bg-gray-50 text-gray-400'}
                              ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
                            `}
                            style={{ height: 'calc(100% - 40px)' }}
                            onClick={() => handleDateClick(day.date)}
                          >
                            <div className="font-medium text-sm mb-2">
                              {day.day}
                            </div>
                            <div className="space-y-1">
                              {day.events.slice(0, 4).map((event, eventIndex) => {
                                const validBookings = validateBookingArray(bookings) ? bookings : [];
                                const booking = validBookings.find((b) => b.id === event.id);
                                
                                return (
                                  <HoverCard key={eventIndex} openDelay={200}>
                                    <HoverCardTrigger asChild>
                                      <div
                                        className={`text-xs p-1 rounded truncate cursor-pointer ${getStatusColor(event.status || 'new')}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (booking) {
                                            setSelectedBookingForDetails(booking);
                                            setBookingDetailsDialogOpen(true);
                                          }
                                        }}
                                      >
                                        {event.title}
                                      </div>
                                    </HoverCardTrigger>
                                    {booking && (
                                      <HoverCardContent className="w-80" align="start">
                                        <div className="space-y-2">
                                          <h4 className="text-sm font-semibold">{booking.eventType || 'Event'}</h4>
                                          <div className="space-y-1 text-sm">
                                            <div className="flex items-center gap-2">
                                              <User className="w-3 h-3 text-gray-500" />
                                              <span className="font-medium">Client:</span>
                                              <span>{booking.clientName || 'Unknown'}</span>
                                            </div>
                                            {booking.venue && (
                                              <div className="flex items-center gap-2">
                                                <MapPin className="w-3 h-3 text-gray-500" />
                                                <span className="font-medium">Venue:</span>
                                                <span>{booking.venue}</span>
                                              </div>
                                            )}
                                            {booking.venueAddress && (
                                              <div className="flex items-start gap-2">
                                                <MapPin className="w-3 h-3 text-gray-500 mt-1" />
                                                <span className="font-medium">Address:</span>
                                                <span className="flex-1">{booking.venueAddress}</span>
                                              </div>
                                            )}
                                            {booking.eventTime && (
                                              <div className="flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-gray-500" />
                                                <span className="font-medium">Time:</span>
                                                <span>{booking.eventTime}</span>
                                              </div>
                                            )}
                                            {booking.fee && (
                                              <div className="flex items-center gap-2">
                                                <PoundSterling className="w-3 h-3 text-gray-500" />
                                                <span className="font-medium">Fee:</span>
                                                <span className="text-green-600">£{booking.fee}</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="pt-2 border-t">
                                            <Badge className={getStatusColor(booking.status || 'new')}>
                                              {booking.status?.replace('_', ' ') || 'New'}
                                            </Badge>
                                          </div>
                                        </div>
                                      </HoverCardContent>
                                    )}
                                  </HoverCard>
                                );
                              })}
                              {day.events.length > 4 && (
                                <div className="text-xs text-gray-500">
                                  +{day.events.length - 4} more
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {calendarView === 'month' && (
                    <div className="h-full flex flex-col">
                      {/* Month Day Headers - Fixed Height */}
                      <div className="grid grid-cols-7 gap-1 flex-shrink-0">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 h-10 flex items-center justify-center">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Month Calendar Days - Fixed Grid Height */}
                      <div className="grid grid-cols-7 gap-1 flex-1" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
                        {(() => {
                          const calendarData = generateCalendarData();
                          // Ensure we always have 42 cells (6 weeks × 7 days) for consistent layout
                          const paddedData = [...calendarData];
                          while (paddedData.length < 42) {
                            paddedData.push({
                              date: new Date(),
                              day: '',
                              isCurrentMonth: false,
                              isToday: false,
                              events: []
                            });
                          }
                          return paddedData.map((day, index) => (
                            <div
                              key={index}
                              className={`
                                p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 overflow-hidden flex flex-col
                                ${day.isCurrentMonth ? '' : 'bg-gray-50 text-gray-400'}
                                ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
                                ${day.day === '' ? 'invisible' : ''}
                              `}
                              onClick={() => day.day !== '' && handleDateClick(day.date)}
                            >
                              <div className="font-medium text-sm mb-1 flex-shrink-0">
                                {day.day}
                              </div>
                              <div className="space-y-1 flex-1 overflow-hidden">
                                {day.events.slice(0, 2).map((event, eventIndex) => {
                                  const validBookings = validateBookingArray(bookings) ? bookings : [];
                                  const booking = validBookings.find((b) => b.id === event.id);
                                  
                                  return (
                                    <HoverCard key={eventIndex} openDelay={200}>
                                      <HoverCardTrigger asChild>
                                        <div
                                          className={`text-xs p-1 rounded truncate cursor-pointer ${getStatusColor(event.status || 'new')}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (booking) {
                                              setSelectedBookingForDetails(booking);
                                              setBookingDetailsDialogOpen(true);
                                            }
                                          }}
                                        >
                                          {event.title}
                                        </div>
                                      </HoverCardTrigger>
                                      {booking && (
                                        <HoverCardContent className="w-80" align="start">
                                          <div className="space-y-2">
                                            <h4 className="text-sm font-semibold">{booking.eventType || 'Event'}</h4>
                                            <div className="space-y-1 text-sm">
                                              <div className="flex items-center gap-2">
                                                <User className="w-3 h-3 text-gray-500" />
                                                <span className="font-medium">Client:</span>
                                                <span>{booking.clientName || 'Unknown'}</span>
                                              </div>
                                              {booking.venue && (
                                                <div className="flex items-center gap-2">
                                                  <MapPin className="w-3 h-3 text-gray-500" />
                                                  <span className="font-medium">Venue:</span>
                                                  <span>{booking.venue}</span>
                                                </div>
                                              )}
                                              {booking.venueAddress && (
                                                <div className="flex items-start gap-2">
                                                  <MapPin className="w-3 h-3 text-gray-500 mt-1" />
                                                  <span className="font-medium">Address:</span>
                                                  <span className="flex-1">{booking.venueAddress}</span>
                                                </div>
                                              )}
                                              {booking.eventTime && (
                                                <div className="flex items-center gap-2">
                                                  <Clock className="w-3 h-3 text-gray-500" />
                                                  <span className="font-medium">Time:</span>
                                                  <span>{booking.eventTime}</span>
                                                </div>
                                              )}
                                              {booking.fee && (
                                                <div className="flex items-center gap-2">
                                                  <PoundSterling className="w-3 h-3 text-gray-500" />
                                                  <span className="font-medium">Fee:</span>
                                                  <span className="text-green-600">£{booking.fee}</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="pt-2 border-t">
                                              <Badge className={getStatusColor(booking.status || 'new')}>
                                                {booking.status?.replace('_', ' ') || 'New'}
                                              </Badge>
                                            </div>
                                          </div>
                                        </HoverCardContent>
                                      )}
                                    </HoverCard>
                                  );
                                })}
                                {day.events.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{day.events.length - 2} more
                                  </div>
                                )}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                  
                  {calendarView === 'year' && (
                    <div className="h-full p-4 overflow-y-auto">
                      <div className="grid grid-cols-3 gap-4">
                        {generateCalendarData().map((month, index) => (
                          <div
                            key={index}
                            className={`
                              p-4 border border-gray-200 rounded-lg cursor-pointer hover:shadow-md transition-shadow
                              ${month.isCurrentMonth ? 'bg-blue-50 border-blue-200' : ''}
                            `}
                            onClick={() => {
                              setCurrentDate(month.date);
                              setCalendarView('month');
                            }}
                          >
                            <div className="text-center">
                              <h4 className="font-semibold text-sm mb-2">
                                {month.date.toLocaleDateString('en-US', { month: 'short' })}
                              </h4>
                              <div className="text-2xl font-bold text-gray-700 mb-2">
                                {month.bookingCount}
                              </div>
                              <div className="text-xs text-gray-500">
                                booking{month.bookingCount !== 1 ? 's' : ''}
                              </div>
                              {month.bookingCount > 0 && (
                                <div className="mt-2 space-y-1">
                                  {month.bookings.slice(0, 3).map((booking: any, bookingIndex: number) => (
                                    <div
                                      key={bookingIndex}
                                      className="text-xs bg-white px-2 py-1 rounded truncate"
                                    >
                                      {booking.clientName || booking.title || 'Event'}
                                    </div>
                                  ))}
                                  {month.bookingCount > 3 && (
                                    <div className="text-xs text-gray-500">
                                      +{month.bookingCount - 3} more
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <BookingDetailsDialog
        open={bookingDetailsDialogOpen}
        onOpenChange={setBookingDetailsDialogOpen}
        booking={selectedBookingForDetails}
        onBookingUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
        }}
      />
      
      <BookingStatusDialog
        open={bookingStatusDialogOpen}
        onOpenChange={setBookingStatusDialogOpen}
        booking={selectedBookingForUpdate}
      />
      
      <SendComplianceDialog
        isOpen={sendComplianceDialogOpen}
        onOpenChange={setSendComplianceDialogOpen}
        booking={selectedBookingForCompliance}
      />
      
      <ConflictResolutionDialog
        isOpen={conflictResolutionDialogOpen}
        onClose={() => setConflictResolutionDialogOpen(false)}
        conflictingBookings={selectedBookingForConflict ? 
          // Find the conflict group that contains this booking
          conflictGroups
            .find(group => group.bookings.some((b: any) => b.id === selectedBookingForConflict.id))
            ?.bookings || []
          : []
        }
        onEditBooking={handleEditBooking}
        onResolveConflict={(bookingToKeep) => {
          // Handle the conflict resolution logic here
          toast({
            title: "Conflict Resolved",
            description: `Kept booking for ${bookingToKeep.clientName}`,
          });
          queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
          setConflictResolutionDialogOpen(false);
        }}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Bookings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedBookings.length} selected booking(s)? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Confirmation Dialog */}
      <AlertDialog open={showBulkStatusDialog} onOpenChange={setShowBulkStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Status for Selected Bookings</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change the status of {selectedBookings.length} selected booking(s) to "{bulkStatusChange?.replace('_', ' ')}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkStatusChange}
              disabled={statusChangeMutation.isPending}
            >
              {statusChangeMutation.isPending ? "Updating..." : "Update Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Mobile Navigation */}
      {!isDesktop && <MobileNav />}
    </div>
  );
}