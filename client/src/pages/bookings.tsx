import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, List, Search, Plus, ChevronLeft, ChevronRight, Menu, Upload, Download, Clock, User, DollarSign, Edit, Trash2, CheckSquare, Square, MoreHorizontal } from "lucide-react";
import { useLocation, Link } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { BookingDetailsDialog } from "@/components/BookingDetailsDialog";
import BookingStatusDialog from "@/components/BookingStatusDialog";
import CalendarImport from "@/components/calendar-import";
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
  
  // Dialog states
  const [bookingDetailsDialogOpen, setBookingDetailsDialogOpen] = useState(false);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<any>(null);
  const [bookingStatusDialogOpen, setBookingStatusDialogOpen] = useState(false);
  const [selectedBookingForUpdate, setSelectedBookingForUpdate] = useState<any>(null);
  
  // Bulk selection states
  const [selectedBookings, setSelectedBookings] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkStatusChange, setBulkStatusChange] = useState<string>("");
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  
  const { isDesktop } = useResponsive();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const toggleSelectAll = () => {
    const filtered = (bookings as any[]).filter((booking: any) => {
      const matchesSearch = !searchQuery || 
        booking.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.venue?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Handle simplified status filtering
      const matchesStatus = statusFilter === 'all' || 
        booking.status === statusFilter ||
        // Group "awaiting_response" and "client_confirms" as "In Progress"
        (statusFilter === 'awaiting_response' && (booking.status === 'awaiting_response' || booking.status === 'client_confirms')) ||
        (statusFilter === 'client_confirms' && (booking.status === 'awaiting_response' || booking.status === 'client_confirms')) ||
        // Map "cancelled" to "Rejected"
        (statusFilter === 'cancelled' && booking.status === 'cancelled');
      return matchesSearch && matchesStatus;
    });
    
    const isAllSelected = filtered.length > 0 && selectedBookings.length === filtered.length;
    
    if (isAllSelected) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(filtered.map((b: any) => b.id));
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
          method: 'PUT',
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

  // Fetch data for both views
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    retry: 2,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contracts"],
    retry: 2,
  });

  // Filter bookings based on search and status  
  const filteredBookings = (bookings as any[]).filter((booking: any) => {
    const matchesSearch = !searchQuery || 
      booking.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.clientEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.venue?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Handle simplified status filtering
    const matchesStatus = statusFilter === 'all' || 
      booking.status === statusFilter ||
      // Group "awaiting_response" and "client_confirms" as "In Progress"
      (statusFilter === 'awaiting_response' && (booking.status === 'awaiting_response' || booking.status === 'client_confirms')) ||
      (statusFilter === 'client_confirms' && (booking.status === 'awaiting_response' || booking.status === 'client_confirms')) ||
      // Map "cancelled" to "Rejected"
      (statusFilter === 'cancelled' && booking.status === 'cancelled');
    
    return matchesSearch && matchesStatus;
  });

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
      
      {/* Main Content */}
      <div className={`transition-all duration-300 ${isDesktop ? "ml-64" : ""}`}>
        {/* Mobile Header */}
        {!isDesktop && (
          <div className="lg:hidden border-b bg-white px-4 py-4">
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

        {/* Content Area */}
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

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by client name, email, or venue..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="awaiting_response">In Progress</SelectItem>
                  <SelectItem value="client_confirms">In Progress</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions Toolbar */}
            {selectedBookings.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
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
                          <DropdownMenuItem onClick={() => handleBulkStatusChange('awaiting_response')}>
                            Mark as In Progress
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkStatusChange('confirmed')}>
                            Mark as Confirmed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkStatusChange('completed')}>
                            Mark as Completed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBulkStatusChange('cancelled')}>
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

            {/* Content Based on View Mode */}
            {viewMode === 'list' ? (
              /* List View */
              <div className="space-y-4">
                {/* Select All Header */}
                {!bookingsLoading && filteredBookings.length > 0 && (
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={filteredBookings.length > 0 && selectedBookings.length === filteredBookings.length}
                          ref={(el) => {
                            if (el && el.querySelector('input')) {
                              const isIndeterminate = selectedBookings.length > 0 && selectedBookings.length < filteredBookings.length;
                              (el.querySelector('input') as HTMLInputElement).indeterminate = isIndeterminate;
                            }
                          }}
                          onCheckedChange={toggleSelectAll}
                        />
                        <span className="text-sm font-medium">
                          {(filteredBookings.length > 0 && selectedBookings.length === filteredBookings.length) ? 'Deselect All' : 'Select All'} ({filteredBookings.length} bookings)
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {bookingsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading bookings...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    {searchQuery || statusFilter !== 'all' ? 'No bookings match your filters' : 'No bookings found'}
                  </div>
                ) : (
                  filteredBookings.map((booking: any) => (
                    <Card 
                      key={booking.id} 
                      className={`hover:shadow-md transition-shadow ${
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
                                    <DollarSign className="w-4 h-4" />
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
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
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