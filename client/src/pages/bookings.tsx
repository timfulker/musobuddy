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
import { Calendar, List, Search, Plus, ChevronLeft, ChevronRight, Menu, Upload, Download, Clock, User, PoundSterling, Trash2, CheckSquare, Square, MoreHorizontal, FileText, Receipt } from "lucide-react";
import { useLocation, Link } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { BookingDetailsDialog } from "@/components/BookingDetailsDialog";
import BookingStatusDialog from "@/components/BookingStatusDialog";
import CalendarImport from "@/components/calendar-import";
import BookingActionMenu from "@/components/booking-action-menu";
import { SendComplianceDialog } from "@/components/SendComplianceDialog";
import ConflictIndicator from "@/components/ConflictIndicator";
import type { Enquiry } from "@shared/schema";

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
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    retry: 2,
  });



  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
    retry: 2,
  });

  // Conflict detection function (same as dashboard)
  const detectConflicts = (booking: any) => {
    if (!booking.eventDate || !booking.eventTime || !booking.eventEndTime) return [];
    
    const bookingDate = new Date(booking.eventDate).toDateString();
    const bookingStart = new Date(`${booking.eventDate}T${booking.eventTime}`);
    const bookingEnd = new Date(`${booking.eventDate}T${booking.eventEndTime}`);
    
    return (bookings as any[])
      .filter((other: any) => {
        if (other.id === booking.id) return false;
        if (!other.eventDate || !other.eventTime || !other.eventEndTime) return false;
        
        const otherDate = new Date(other.eventDate).toDateString();
        if (otherDate !== bookingDate) return false;
        
        const otherStart = new Date(`${other.eventDate}T${other.eventTime}`);
        const otherEnd = new Date(`${other.eventDate}T${other.eventEndTime}`);
        
        // Check for time overlap
        const hasTimeOverlap = bookingStart < otherEnd && bookingEnd > otherStart;
        
        return hasTimeOverlap || bookingDate === otherDate; // Return true for conflicts
      })
      .map((other: any) => {
        const otherStart = new Date(`${other.eventDate}T${other.eventTime}`);
        const otherEnd = new Date(`${other.eventDate}T${other.eventEndTime}`);
        const hasTimeOverlap = bookingStart < otherEnd && bookingEnd > otherStart;
        
        return {
          withBookingId: other.id,
          severity: (hasTimeOverlap ? 'hard' : 'soft') as 'hard' | 'soft' | 'resolved',
          clientName: other.clientName || 'Unknown Client',
          status: other.status || 'new',
          time: `${other.eventTime} - ${other.eventEndTime}`,
          canEdit: true,
          canReject: true,
          type: 'booking',
          message: hasTimeOverlap ? 
            `Time overlap with ${other.clientName || 'Unknown Client'}` : 
            `Same day booking with ${other.clientName || 'Unknown Client'}`,
          overlapMinutes: hasTimeOverlap ? 
            Math.round((Math.min(bookingEnd.getTime(), otherEnd.getTime()) - Math.max(bookingStart.getTime(), otherStart.getTime())) / (1000 * 60)) : 0
        };
      });
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

    let filtered = (bookings as any[]).filter((booking: any) => {
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
          case 'today':
            const todayEnd = new Date(today);
            todayEnd.setDate(todayEnd.getDate() + 1);
            matchesDate = eventDate >= today && eventDate < todayEnd;
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
      if (sortField === 'eventDate') {
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

    (bookings as any[]).forEach((booking: any) => {
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
      case 'contract_sent': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };



  // Generate calendar grid
  const generateCalendar = () => {
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

  const handleDateClick = (date: Date) => {
    const events = getEventsForDate(date);
    if (events.length > 0) {
      const firstEvent = events[0];
      const booking = (bookings as any[]).find((b: any) => b.id === firstEvent.id);
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

  const days = generateCalendar();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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
                  
                  <Link href="/bookings?action=new">
                    <Button className="bg-purple-600 hover:bg-purple-700">
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
                      <SelectItem value="today">Today</SelectItem>
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

                {/* Sort Controls Row */}
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
                </div>
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

        {/* Scrollable Content Area - Force height constraint */}
        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 450px)' }}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">

            {/* Content Based on View Mode */}
            {viewMode === 'list' ? (
              /* List View */
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
                  filteredAndSortedBookings.map((booking: any) => (
                    <Card 
                      key={booking.id} 
                      className={`relative hover:shadow-md transition-shadow border-l-4 ${getStatusBorderColor(booking.status)} ${
                        selectedBookings.includes(booking.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                    >
                      {/* Conflict Indicator - Top Right Corner */}
                      <ConflictIndicator 
                        bookingId={booking.id} 
                        conflicts={detectConflicts(booking)}
                      />
                      
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
                                <Badge variant="outline" className="text-xs text-red-700 bg-red-50 border-red-300">
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
                            {/* Document Viewing Buttons */}
                            {(() => {
                              // Find contract for this booking
                              const bookingContract = Array.isArray(contracts) ? contracts.find(
                                (contract: any) => contract.enquiryId === booking.id
                              ) : null;


                              
                              // Find invoice for this booking  
                              const bookingInvoice = Array.isArray(invoices) ? invoices.find(
                                (invoice: any) => invoice.bookingId === booking.id
                              ) : null;
                              


                              return (
                                <>
                                  {/* View Contract Button */}
                                  {bookingContract && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`/view/contracts/${bookingContract.id}`, '_blank');
                                      }}
                                    >
                                      <FileText className="w-4 h-4 mr-1" />
                                      View Contract
                                    </Button>
                                  )}
                                  
                                  {/* View Invoice Button */}
                                  {bookingInvoice && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(`/view/invoices/${bookingInvoice.id}`, '_blank');
                                      }}
                                    >
                                      <Receipt className="w-4 h-4 mr-1" />
                                      View Invoice
                                    </Button>
                                  )}
                                </>
                              );
                            })()}

                            {/* Contract Call-to-Action for Client Confirms status */}
                            {booking.status === 'client_confirms' && (
                              <Button 
                                size="sm" 
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                onClick={() => navigate(`/contracts?bookingId=${booking.id}&action=create`)}
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Send Contract
                              </Button>
                            )}
                            
                            <BookingActionMenu 
                              booking={booking} 
                              onSendCompliance={openComplianceDialog}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            ) : (
              /* Calendar View */
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Button variant="outline" size="sm" onClick={goToPrevious}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <h2 className="text-xl font-semibold">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                      </h2>
                      <Button variant="outline" size="sm" onClick={goToNext}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
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
                <CardContent>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Day Headers */}
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar Days */}
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className={`
                          min-h-24 p-2 border border-gray-200 cursor-pointer hover:bg-gray-50
                          ${day.isCurrentMonth ? '' : 'bg-gray-50 text-gray-400'}
                          ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
                        `}
                        onClick={() => handleDateClick(day.date)}
                      >
                        <div className="font-medium text-sm mb-1">
                          {day.day}
                        </div>
                        <div className="space-y-1">
                          {day.events.slice(0, 3).map((event, eventIndex) => (
                            <div
                              key={eventIndex}
                              className={`text-xs p-1 rounded truncate ${getStatusColor(event.status || 'new')}`}
                            >
                              {event.title}
                            </div>
                          ))}
                          {day.events.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{day.events.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Dialogs */}
      <BookingDetailsDialog
        open={bookingDetailsDialogOpen}
        onOpenChange={setBookingDetailsDialogOpen}
        booking={selectedBookingForDetails}
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