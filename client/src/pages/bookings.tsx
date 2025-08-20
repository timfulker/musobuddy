import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, List, Search, Plus, ChevronLeft, ChevronRight, Menu, Upload, Download, Clock, User, PoundSterling, Trash2, CheckSquare, Square, MoreHorizontal, FileText, Receipt, Crown, Lock, MapPin, Filter, X, ChevronDown, Settings, Paperclip, MessageCircle, Edit, Eye, Reply, ThumbsUp, Shield, XCircle, MessageSquare, DollarSign } from "lucide-react";
import { useLocation, Link, useRoute } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { calculateBookingDisplayTotal, getBookingAmountDisplayText } from "@/utils/booking-calculations";
// BookingDetailsDialog removed - using new-booking page for all editing
import BookingStatusDialog from "@/components/BookingStatusDialog";
import CalendarImport from "@/components/calendar-import";

import HoverResponseMenu from "@/components/hover-response-menu";
import { SendComplianceDialog } from "@/components/SendComplianceDialog";
import ConflictIndicator from "@/components/ConflictIndicator";
import ConflictResolutionDialog from "@/components/ConflictResolutionDialog";
import BookingDocumentsManager from "@/components/booking-documents-manager";
import { BookingDocumentIndicator } from "@/components/booking-document-indicator";
import { ComplianceIndicator } from "@/components/compliance-indicator";
import { CommunicationHistory } from "@/components/communication-history";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  const { theme } = useTheme();
  
  // Simple navigation function using window.location
  const navigate = (path: string) => {
    window.location.href = path;
  };
  
  // Fetch user settings for theme color
  const { data: settings } = useQuery({
    queryKey: ['/api/settings'],
    retry: false,
  });
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

  // View mode state - Default to list view for better UX
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('bookingViewMode') as ViewMode) || 'list';
  });
  
  // Calendar state for calendar view
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  
  // Shared state
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [previousStatusFilter, setPreviousStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>(() => {
    return localStorage.getItem('bookingSortField') || 'eventDate';
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    return (localStorage.getItem('bookingSortDirection') as 'asc' | 'desc') || 'desc';
  });
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [conflictFilter, setConflictFilter] = useState<boolean>(false);
  
  // Dialog states
  // BookingDetailsDialog state removed - using new-booking page for all editing
  // selectedBookingForDetails removed - using new-booking page for all editing
  const [bookingStatusDialogOpen, setBookingStatusDialogOpen] = useState(false);
  const [selectedBookingForUpdate, setSelectedBookingForUpdate] = useState<any>(null);
  const [sendComplianceDialogOpen, setSendComplianceDialogOpen] = useState(false);
  const [selectedBookingForCompliance, setSelectedBookingForCompliance] = useState<any>(null);
  
  // Conflict resolution dialog states
  const [conflictResolutionDialogOpen, setConflictResolutionDialogOpen] = useState(false);
  const [selectedBookingForConflict, setSelectedBookingForConflict] = useState<any>(null);
  
  // Document upload dialog states
  const [documentUploadDialogOpen, setDocumentUploadDialogOpen] = useState(false);
  const [selectedBookingForDocument, setSelectedBookingForDocument] = useState<any>(null);
  
  // Communication history dialog states
  const [communicationHistoryDialogOpen, setCommunicationHistoryDialogOpen] = useState(false);
  const [selectedBookingForCommunications, setSelectedBookingForCommunications] = useState<any>(null);
  
  // Full-screen calendar modal state
  const [fullScreenCalendarOpen, setFullScreenCalendarOpen] = useState(false);
  const [fullScreenSelectedDate, setFullScreenSelectedDate] = useState<Date | null>(null);
  const [fullScreenCurrentDate, setFullScreenCurrentDate] = useState(new Date());
  
  // Bulk selection states
  const [selectedBookings, setSelectedBookings] = useState<number[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkStatusChange, setBulkStatusChange] = useState<string>("");
  const [showBulkStatusDialog, setShowBulkStatusDialog] = useState(false);
  
  // Individual booking deletion states
  const [selectedBookingForDeletion, setSelectedBookingForDeletion] = useState<any>(null);
  const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false);

  // Hover card portal states
  const [hoveredBooking, setHoveredBooking] = useState<any>(null);
  const [hoverCardPosition, setHoverCardPosition] = useState({ x: 0, y: 0 });
  const [hoverCardVisible, setHoverCardVisible] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Clean up hover card state when full screen calendar closes
  useEffect(() => {
    if (!fullScreenCalendarOpen) {
      setHoverCardVisible(false);
      setHoveredBooking(null);
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        setHoverTimeout(null);
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        setHideTimeout(null);
      }
    }
  }, [fullScreenCalendarOpen, hoverTimeout, hideTimeout]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hoverTimeout, hideTimeout]);

  
  const { isDesktop } = useResponsive();
  const { toast } = useToast();

  // Fetch data for both views
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["/api/bookings"],
    retry: 2,
    queryFn: async () => {
      const response = await apiRequest('/api/bookings');
      const data = await response.json();
      
      // Debug: Check what venue data we have for Encore bookings
      const encoreBookings = data.filter((booking: any) => booking.applyNowLink);
      if (encoreBookings.length > 0) {
        console.log(`🎵 Bookings page - Found ${encoreBookings.length} Encore bookings. First one:`, encoreBookings[0]);
        console.log(`🎵 Bookings page - Venue fields: venue="${encoreBookings[0].venue}", venueAddress="${encoreBookings[0].venueAddress}", venue_address="${encoreBookings[0].venue_address}"`);
      }
      
      return data;
    },
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

  // Fetch blocked dates
  const { data: blockedDates = [] } = useQuery({
    queryKey: ["/api/blocked-dates"],
    retry: 2,
  });

  // Backend conflicts loaded

  // Highlight state for calendar navigation
  const [highlightedBookingId, setHighlightedBookingId] = useState<string | null>(null);
  
  // Handle URL parameters for booking navigation from dashboard
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');
    const highlightId = urlParams.get('highlight');
    const viewParam = urlParams.get('view');
    
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
        
        // Navigate to edit booking after a short delay
        setTimeout(() => {
          navigateToEditBooking(targetBooking);
        }, 300);
        
        // Clean up URL parameter
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
    
    // Handle highlight parameter (from dashboard card click)
    if (highlightId && bookings.length > 0) {
      const validBookings = validateBookingArray(bookings) ? bookings : [];
      const targetBooking = validBookings.find((b) => b.id.toString() === highlightId);
      
      if (targetBooking && targetBooking.eventDate) {
        // Navigate calendar to booking's month
        const bookingDate = new Date(targetBooking.eventDate);
        setCurrentDate(bookingDate);
        
        // Switch to calendar view if specified
        if (viewParam === 'calendar') {
          setViewMode('calendar');
          localStorage.setItem('bookingViewMode', 'calendar');
        }
        
        // Set highlighting state
        setHighlightedBookingId(highlightId);
        
        // Clean up URL parameter immediately
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        // Highlight will be cleared on calendar click (handled below)
      }
    }
  }, [bookings, navigate]); // Depend on bookings data and navigate

  // Auto-scroll behavior based on sort criteria
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlParams = urlParams.has('id') || urlParams.has('highlight');
    
    // Only auto-scroll if no URL parameters (natural page arrival) and list view
    if (hasUrlParams || viewMode !== 'list' || !bookings || bookings.length === 0) {
      return;
    }

    // Get the booking ID we might be returning from (if any)
    const returningFromBookingId = localStorage.getItem('bookingReturnToId');
    const returningFromBooking = returningFromBookingId ? 
      bookings.find(b => b.id.toString() === returningFromBookingId) : null;

    setTimeout(() => {
      if (sortField === 'eventDate' && !returningFromBooking) {
        // For date sorting: scroll to next upcoming booking (current behavior)
        const now = new Date();
        const validBookings = validateBookingArray(bookings) ? bookings : [];
        const upcomingBookings = validBookings
          .filter(booking => booking.eventDate && new Date(booking.eventDate) >= now)
          .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime());
        
        if (upcomingBookings.length > 0) {
          const nextBooking = upcomingBookings[0];
          const bookingElement = document.querySelector(`[data-booking-id="${nextBooking.id}"]`);
          if (bookingElement) {
            bookingElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }
      } else if (returningFromBooking) {
        // If returning from viewing a specific booking, scroll back to it
        const bookingElement = document.querySelector(`[data-booking-id="${returningFromBooking.id}"]`);
        if (bookingElement) {
          bookingElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
        // Clear the return ID after using it
        localStorage.removeItem('bookingReturnToId');
      } else {
        // For other sort criteria: scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 500);
  }, [bookings, viewMode, sortField]); // Added sortField dependency

  // Clear highlight on calendar click
  useEffect(() => {
    if (!highlightedBookingId || viewMode !== 'calendar') return;
    
    const handleCalendarClick = (e: MouseEvent) => {
      // Clear the highlight when clicking anywhere on the calendar
      setHighlightedBookingId(null);
    };
    
    // Add click listener after a small delay to avoid immediate trigger
    const timer = setTimeout(() => {
      document.addEventListener('click', handleCalendarClick);
    }, 100);
    
    // Cleanup
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleCalendarClick);
    };
  }, [highlightedBookingId, viewMode]);

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
  
  const openDocumentManagerDialog = (booking: any) => {
    setSelectedBookingForDocument(booking);
    setDocumentUploadDialogOpen(true);
  };
  
  // Navigation to conversation page - replaces old dialog
  const openConversation = (booking: any) => {
    navigate(`/conversation/${booking.id}`);
  };

  // Helper function to navigate to edit booking and remember position
  const navigateToEditBooking = (booking: any) => {
    // Store the booking ID so we can return to it later
    localStorage.setItem('bookingReturnToId', booking.id.toString());
    navigate(`/new-booking?edit=${booking.id}`);
  };
  
  // Enhanced sorting function
  const handleSort = (field: string) => {
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      localStorage.setItem('bookingSortDirection', newDirection);
    } else {
      setSortField(field);
      setSortDirection('desc');
      localStorage.setItem('bookingSortField', field);
      localStorage.setItem('bookingSortDirection', 'desc');
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
      
      const matchesStatus = statusFilter === 'all' || 
        booking.status === statusFilter ||
        (statusFilter === 'dateless' && !booking.eventDate);
      
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

  // TEMPORARY: Manual re-processing mutation for selected bookings
  const reprocessMutation = useMutation({
    mutationFn: async (bookingIds: number[]) => {
      const response = await apiRequest('/api/admin/reprocess-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingIds })
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.refetchQueries({ queryKey: ["/api/bookings"] }); // Force immediate refetch
      setSelectedBookings([]);
      toast({
        title: "Re-processing Complete", 
        description: `Processed ${data.results.total} bookings, improved ${data.results.improved}. Please refresh if needed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Re-processing Failed",
        description: error.message || "Failed to re-process bookings",
        variant: "destructive",
      });
    },
  });

  // Mutation for toggling Encore booking application status
  const markAppliedMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number, status: string }) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: variables.status === 'in_progress' ? "Application Recorded" : "Application Removed",
        description: variables.status === 'in_progress' 
          ? "The Encore booking has been marked as applied and moved to In Progress"
          : "The Encore booking has been moved back to New status",
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

  // Individual booking deletion functions
  const openDeleteDialog = (booking: any) => {
    setSelectedBookingForDeletion(booking);
    setSingleDeleteDialogOpen(true);
  };

  const confirmSingleDelete = () => {
    if (selectedBookingForDeletion) {
      deleteMutation.mutate([selectedBookingForDeletion.id]);
      setSingleDeleteDialogOpen(false);
      setSelectedBookingForDeletion(null);
    }
  };

  const closeSingleDeleteDialog = () => {
    setSingleDeleteDialogOpen(false);
    setSelectedBookingForDeletion(null);
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
    // Create date string for comparison - use local date to avoid timezone issues
    const dateStr = date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
    const events: CalendarEvent[] = [];
    const seenBookingIds = new Set(); // Track seen booking IDs to prevent duplicates

    const validBookings = validateBookingArray(bookings) ? bookings : [];
    validBookings.forEach((booking) => {
      // Exclude rejected bookings from calendar view but keep them in storage for reference
      if (booking.eventDate && booking.status !== 'rejected') {
        // Skip if we've already seen this booking ID
        if (seenBookingIds.has(booking.id)) {
          console.warn(`🔄 Duplicate booking ID detected: ${booking.id} for ${booking.clientName}`);
          return;
        }
        
        // Parse the eventDate properly to handle timezone issues
        let bookingDate: Date;
        if (typeof booking.eventDate === 'string') {
          // If it's an ISO date string, extract just the date part to avoid timezone shifts
          if (booking.eventDate.includes('T')) {
            const datePart = booking.eventDate.split('T')[0];
            const [year, month, day] = datePart.split('-').map(Number);
            bookingDate = new Date(year, month - 1, day); // Create local date
          } else {
            bookingDate = new Date(booking.eventDate);
          }
        } else {
          bookingDate = new Date(booking.eventDate);
        }
        
        const bookingDateStr = bookingDate.getFullYear() + '-' + 
          String(bookingDate.getMonth() + 1).padStart(2, '0') + '-' + 
          String(bookingDate.getDate()).padStart(2, '0');
        
        if (bookingDateStr === dateStr) {
          seenBookingIds.add(booking.id); // Mark as seen
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

  // Check if a date is blocked
  const isDateBlocked = (date: Date) => {
    if (!Array.isArray(blockedDates)) return null;
    
    return blockedDates.find((blocked: any) => {
      const startDate = new Date(blocked.startDate);
      const endDate = new Date(blocked.endDate);
      const checkDate = new Date(date);
      
      // Reset time for date-only comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      checkDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const formatReceivedTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString("en-GB", { 
        day: "numeric", 
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
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
        navigateToEditBooking(booking);
      }
    } else {
      // Open full-screen calendar modal for empty dates
      setFullScreenSelectedDate(date);
      setFullScreenCurrentDate(new Date(date));
      setFullScreenCalendarOpen(true);
    }
  };

  const handleBookingClick = (booking: any) => {
    // Navigate to new-booking page with booking ID for editing
    navigateToEditBooking(booking);
  };

  // Handler for editing booking from conflict resolution dialog
  const handleEditBookingFromConflict = (booking: any) => {
    console.log('handleEditBookingFromConflict called with booking:', booking);
    // Navigate to new-booking page with booking ID for editing
    navigateToEditBooking(booking);
  };

  // Handler for editing booking from action menu
  const handleEditBooking = (booking: any) => {
    navigateToEditBooking(booking);
  };

  // Get calendar data for the current view
  const calendarData = generateCalendarData();

  // Show loading state if bookings data is not ready
  if (bookingsLoading || !bookings) {
    return (
      <div className="min-h-screen bg-background layout-consistent">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`h-screen flex flex-col transition-all duration-300 ${isDesktop ? "ml-64" : ""}`}>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading bookings...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              {/* Hero Section */}
              <div className="mb-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Your Bookings</h1>
                    <p className="text-gray-600 mt-1">Manage your events and client communications</p>
                  </div>
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

                {viewMode === 'list' && (
                  <>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-100 text-sm">This Week</p>
                              <p className="text-2xl font-bold">
                                {(bookings || []).filter((b: any) => {
                                  const eventDate = new Date(b.eventDate);
                                  const today = new Date();
                                  const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                                  const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
                                  
                                  // Only count confirmed bookings that are happening this week
                                  return eventDate >= startOfWeek && 
                                         eventDate <= endOfWeek && 
                                         b.status === "confirmed";
                                }).length}
                              </p>
                            </div>
                            <Calendar className="w-8 h-8 text-blue-200" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-green-100 text-sm">Confirmed</p>
                              <p className="text-2xl font-bold">
                                {(bookings || []).filter((b: any) => b.status === "confirmed").length}
                              </p>
                            </div>
                            <CheckSquare className="w-8 h-8 text-green-200" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-orange-100 text-sm">Pending</p>
                              <p className="text-2xl font-bold">
                                {(bookings || []).filter((b: any) => b.status === "in_progress" || b.status === "new").length}
                              </p>
                            </div>
                            <Clock className="w-8 h-8 text-orange-200" />
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-100 text-sm">Total Revenue</p>
                              <p className="text-2xl font-bold">
                                £{(bookings || []).filter((b: any) => b.status !== 'rejected' && b.status !== 'cancelled').reduce((sum: number, b: any) => sum + (parseFloat(b.fee) || 0), 0).toLocaleString()}
                              </p>
                            </div>
                            <PoundSterling className="w-8 h-8 text-purple-200" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>

              {/* Enhanced Filters */}
              <div className="space-y-4">
                {/* Search and Filter Bar - Cleaner for List View */}
                {viewMode === 'list' ? (
                  <div className="flex flex-col lg:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <Input
                          placeholder="Search bookings, clients, venues..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
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
                        <SelectTrigger className={`w-40 ${conflictFilter ? 'opacity-50' : ''}`}>
                          <SelectValue placeholder={conflictFilter ? "All Status" : "All Status"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="dateless">Date TBC</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Conflict Filter Toggle for List View */}
                      <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
                        <Switch
                          id="conflict-filter-list"
                          checked={conflictFilter}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPreviousStatusFilter(statusFilter);
                              setStatusFilter('all');
                            } else {
                              setStatusFilter(previousStatusFilter);
                            }
                            setConflictFilter(checked);
                          }}
                          className="data-[state=checked]:bg-red-500"
                        />
                        <label 
                          htmlFor="conflict-filter-list" 
                          className="text-xs font-medium cursor-pointer whitespace-nowrap"
                        >
                          Show Conflicts
                        </label>
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                          setDateFilter("all");
                          setConflictFilter(false);
                        }}
                        className="px-3"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Original detailed filters for calendar view */
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
                      <SelectItem value="dateless">Date TBC</SelectItem>
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
                )}

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
                <div className="flex items-center gap-2">
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
                        localStorage.setItem('bookingSortField', 'eventDate');
                        localStorage.setItem('bookingSortDirection', 'desc');
                      }}
                      className="h-8"
                    >
                      Clear All Filters
                    </Button>
                  )}

                </div>
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
                          variant="outline" 
                          size="sm"
                          onClick={() => reprocessMutation.mutate(selectedBookings)}
                          disabled={reprocessMutation.isPending}
                          className="border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          {reprocessMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                              Re-processing...
                            </>
                          ) : (
                            <>
                              <Settings className="w-4 h-4 mr-2" />
                              Re-process Selected
                            </>
                          )}
                        </Button>
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
                                        data-booking-id={groupBooking.id}
                                        className={`relative hover:shadow-md transition-shadow border-l-4 ${getStatusBorderColor(groupBooking.status)} ${
                                          selectedBookings.includes(groupBooking.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                                        } ${index < visibleGroupBookings.length - 1 ? 'border-b border-gray-200' : ''} rounded-none border-0`}
                                      >
                                        <CardContent className="p-6">
                                          <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-4 flex-1">
                                              <Checkbox
                                                checked={selectedBookings.includes(groupBooking.id)}
                                                onCheckedChange={() => toggleSelectBooking(groupBooking.id)}
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                              
                                              {/* Prominent Date Display - Similar to Dashboard */}
                                              <div className="flex-shrink-0 text-center border-r border-gray-200 pr-4 mr-2">
                                                <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                                                  {new Date(groupBooking.eventDate).toLocaleDateString('en-US', { weekday: 'short' })}
                                                </div>
                                                <div className="text-3xl font-bold text-gray-900 leading-none mt-1">
                                                  {new Date(groupBooking.eventDate).getDate()}
                                                </div>
                                                <div className="text-sm text-gray-500 mt-1">
                                                  {new Date(groupBooking.eventDate).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    year: 'numeric' 
                                                  })}
                                                </div>
                                              </div>

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
                                                {/* Document indicator - includes both new and legacy documents */}
                                                <BookingDocumentIndicator 
                                                  bookingId={groupBooking.id}
                                                  booking={groupBooking}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openDocumentManagerDialog(groupBooking);
                                                  }}
                                                />
                                                {/* Compliance indicator - shows available compliance documents */}
                                                <ComplianceIndicator 
                                                  bookingId={groupBooking.id}
                                                  booking={groupBooking}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openComplianceDialog(groupBooking);
                                                  }}
                                                />
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
                                                  {(groupBooking.venue || groupBooking.venueAddress) && (
                                                    <span className="flex items-center gap-1">
                                                      <MapPin className="w-4 h-4" />
                                                      {/* Show area for Encore bookings, venue for others */}
                                                      {groupBooking.applyNowLink && groupBooking.venueAddress 
                                                        ? groupBooking.venueAddress 
                                                        : groupBooking.venue}
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
                                                      {(() => {
                                                        const amountDisplay = getBookingAmountDisplayText(groupBooking, settings);
                                                        return amountDisplay.subtitle 
                                                          ? `${amountDisplay.main} ${amountDisplay.subtitle}`
                                                          : amountDisplay.main;
                                                      })()}
                                                    </span>
                                                  )}
                                                  {groupBooking.applyNowLink && (
                                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                                      🎵 ENCORE
                                                    </Badge>
                                                  )}
                                                </div>
                                                {groupBooking.createdAt && (
                                                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    Received {formatReceivedTime(groupBooking.createdAt)}
                                                  </div>
                                                )}
                                              </div>
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center justify-end gap-3 mt-4">
                                            {groupBooking.applyNowLink && (
                                              <div className="flex items-center gap-3">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(groupBooking.applyNowLink, '_blank');
                                                  }}
                                                  className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                                                >
                                                  🎵 Apply on Encore
                                                </Button>
                                                <div className="flex items-center gap-2 text-sm">
                                                  <span className="text-gray-600">Applied:</span>
                                                  <Switch
                                                    checked={groupBooking.status === 'in_progress' || groupBooking.status === 'confirmed' || groupBooking.status === 'completed'}
                                                    onCheckedChange={(checked) => {
                                                      const newStatus = checked ? 'in_progress' : 'new';
                                                      markAppliedMutation.mutate({ bookingId: groupBooking.id, status: newStatus });
                                                    }}
                                                    disabled={markAppliedMutation.isPending}
                                                    className="data-[state=checked]:bg-green-600"
                                                  />
                                                </div>
                                              </div>
                                            )}
                                            {/* Primary Action Buttons - Clean Hybrid Approach */}
                                            <div className="flex items-center gap-2">
                                              {/* Most Important Actions - Direct Access */}
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(`/templates?bookingId=${groupBooking.id}&action=respond`);
                                                }}
                                                className="text-blue-600 hover:bg-blue-50"
                                              >
                                                <MessageSquare className="w-4 h-4 mr-1" />
                                                Respond
                                              </Button>
                                              
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openConversation(groupBooking);
                                                }}
                                                className="text-indigo-600 hover:bg-indigo-50"
                                              >
                                                <MessageCircle className="w-4 h-4 mr-1" />
                                                Conversation
                                              </Button>
                                              
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigateToEditBooking(groupBooking);
                                                }}
                                                className="text-purple-600 hover:bg-purple-50"
                                              >
                                                <Eye className="w-4 h-4 mr-1" />
                                                View
                                              </Button>
                                              
                                              {/* Secondary Actions - Dropdown Menu */}
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-gray-600 hover:bg-gray-50"
                                                  >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigate(`/templates?bookingId=${groupBooking.id}&action=thankyou`);
                                                    }}
                                                  >
                                                    <ThumbsUp className="w-4 h-4 mr-2" />
                                                    Send Thank You
                                                  </DropdownMenuItem>

                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigate(`/invoices?create=true&bookingId=${groupBooking.id}`);
                                                    }}
                                                  >
                                                    <DollarSign className="w-4 h-4 mr-2" />
                                                    Create Invoice
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigate(`/contracts/new?bookingId=${groupBooking.id}`);
                                                    }}
                                                  >
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Create Contract
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      openComplianceDialog(groupBooking);
                                                    }}
                                                  >
                                                    <Shield className="w-4 h-4 mr-2" />
                                                    Send Compliance
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem
                                                    onClick={async (e) => {
                                                      e.stopPropagation();
                                                      try {
                                                        await apiRequest(`/api/bookings/${groupBooking.id}`, {
                                                          method: 'PATCH',
                                                          body: JSON.stringify({ status: 'rejected' }),
                                                          headers: { 'Content-Type': 'application/json' }
                                                        });
                                                        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                                                        toast({
                                                          title: "Booking rejected",
                                                          description: "Status updated successfully",
                                                        });
                                                      } catch (error) {
                                                        toast({
                                                          title: "Error",
                                                          description: "Failed to reject booking",
                                                          variant: "destructive",
                                                        });
                                                      }
                                                    }}
                                                    className="text-red-600 focus:text-red-600"
                                                  >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Reject Booking
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
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
                          data-booking-id={booking.id}
                          className={`relative hover:shadow-md transition-shadow border-l-4 ${getStatusBorderColor(booking.status)} ${
                            selectedBookings.includes(booking.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4 flex-1">
                                <Checkbox
                                  checked={selectedBookings.includes(booking.id)}
                                  onCheckedChange={() => toggleSelectBooking(booking.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                
                                {/* Prominent Date Display - Similar to Dashboard */}
                                <div className="flex-shrink-0 text-center border-r border-gray-200 pr-4 mr-2">
                                  <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                                    {new Date(booking.eventDate).toLocaleDateString('en-US', { weekday: 'short' })}
                                  </div>
                                  <div className="text-3xl font-bold text-gray-900 leading-none mt-1">
                                    {new Date(booking.eventDate).getDate()}
                                  </div>
                                  <div className="text-sm text-gray-500 mt-1">
                                    {new Date(booking.eventDate).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      year: 'numeric' 
                                    })}
                                  </div>
                                </div>

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
                                  {/* Document indicator - includes both new and legacy documents */}
                                  <BookingDocumentIndicator 
                                    bookingId={booking.id}
                                    booking={booking}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDocumentManagerDialog(booking);
                                    }}
                                  />
                                  {/* Compliance indicator - shows available compliance documents */}
                                  <ComplianceIndicator 
                                    bookingId={booking.id}
                                    booking={booking}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openComplianceDialog(booking);
                                    }}
                                  />
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
                                    {(booking.venue || booking.venueAddress) && (
                                      <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {/* Show area for Encore bookings, venue for others */}
                                        {booking.applyNowLink && booking.venueAddress 
                                          ? booking.venueAddress 
                                          : booking.venue}
                                      </span>
                                    )}
                                    {booking.eventTime && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {booking.eventTime}
                                      </span>
                                    )}
                                    {booking.fee && (
                                      <span className="flex items-center gap-1 font-medium text-green-600">
                                        <PoundSterling className="w-4 h-4" />
                                        {booking.fee}
                                      </span>
                                    )}
                                    {booking.applyNowLink && (
                                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                                        🎵 ENCORE
                                      </Badge>
                                    )}
                                  </div>
                                  {booking.createdAt && (
                                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                      <Clock className="w-3 h-3" />
                                      Received {formatReceivedTime(booking.createdAt)}
                                    </div>
                                  )}
                                </div>
                                </div>
                              </div>
                            </div>
                            {/* Action Buttons Row */}
                            <div className="flex items-center justify-end gap-3 mt-4">
                              {booking.applyNowLink && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    
                                    // Update booking status to "In progress"
                                    try {
                                      const token = getAuthToken();
                                      const response = await fetch(`/api/bookings/${booking.id}`, {
                                        method: "PATCH",
                                        headers: { 
                                          "Content-Type": "application/json",
                                          "Authorization": `Bearer ${token}`,
                                        },
                                        body: JSON.stringify({ status: 'in_progress' }),
                                      });

                                      if (response.ok) {
                                        // Refresh the bookings list
                                        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                                        toast({
                                          title: "Application submitted",
                                          description: "Booking status updated to In Progress",
                                        });
                                      }
                                    } catch (error) {
                                      console.error('Error updating booking status:', error);
                                    }
                                    
                                    // Open Encore link in new tab
                                    window.open(booking.applyNowLink, '_blank');
                                  }}
                                  className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                                >
                                  🎵 Apply on Encore
                                </Button>
                              )}
                              
                              {/* Primary Actions - Clean Hybrid Approach */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/templates?bookingId=${booking.id}&action=respond`);
                                }}
                                className="text-blue-600 hover:bg-blue-50"
                              >
                                <MessageSquare className="w-4 h-4 mr-1" />
                                Respond
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConversation(booking);
                                }}
                                className="text-indigo-600 hover:bg-indigo-50"
                              >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Conversation
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToEditBooking(booking);
                                }}
                                className="text-purple-600 hover:bg-purple-50"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/booking-summary/${booking.id}`, '_blank');
                                }}
                                className="text-green-600 hover:bg-green-50"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Summary
                              </Button>
                              
                              {/* Secondary Actions - Dropdown Menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-600 hover:bg-gray-50"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/templates?bookingId=${booking.id}&action=thankyou`);
                                    }}
                                  >
                                    <ThumbsUp className="w-4 h-4 mr-2" />
                                    Send Thank You
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/invoices?create=true&bookingId=${booking.id}`);
                                    }}
                                  >
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Create Invoice
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/contracts/new?bookingId=${booking.id}`);
                                    }}
                                  >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Create Contract
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openComplianceDialog(booking);
                                    }}
                                  >
                                    <Shield className="w-4 h-4 mr-2" />
                                    Send Compliance
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        await apiRequest(`/api/bookings/${booking.id}`, {
                                          method: 'PATCH',
                                          body: JSON.stringify({ status: 'rejected' }),
                                          headers: { 'Content-Type': 'application/json' }
                                        });
                                        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
                                        toast({
                                          title: "Booking rejected",
                                          description: "Status updated successfully",
                                        });
                                      } catch (error) {
                                        toast({
                                          title: "Error",
                                          description: "Failed to reject booking",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject Booking
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
                        
                        {/* Navigation - Combined Arrow + Today Navigation */}
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Button variant="outline" size="sm" onClick={goToPrevious}>
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setCurrentDate(new Date())}
                            className="text-xs px-4"
                          >
                            Today
                          </Button>
                          <Button variant="outline" size="sm" onClick={goToNext}>
                            Next
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
                                          navigateToEditBooking(booking);
                                        }
                                      }}
                                    >
                                      <div className="font-medium">{event.title}</div>
                                      {booking && (
                                        <div className="text-sm mt-1 space-y-1">
                                          {booking.eventTime && <div>Time: {booking.eventTime}</div>}
                                          {booking.venue && <div>Venue: {booking.venue}</div>}
                                          {booking.fee && (
                                            <div>Fee: {(() => {
                                              const amountDisplay = getBookingAmountDisplayText(booking, settings);
                                              return amountDisplay.subtitle 
                                                ? `${amountDisplay.main} ${amountDisplay.subtitle}`
                                                : amountDisplay.main;
                                            })()}</div>
                                          )}
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
                                  <HoverCard 
                                    key={eventIndex} 
                                    openDelay={200} 
                                    closeDelay={3000}
                                  >
                                    <HoverCardTrigger asChild>
                                      <div
                                        className={`text-xs p-1 rounded truncate cursor-pointer ${getStatusColor(event.status || 'new')} ${
                                          highlightedBookingId === event.id.toString() ? 'ring-2 ring-yellow-400 ring-offset-1 shadow-lg' : ''
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (booking) {
                                            navigateToEditBooking(booking);
                                          }
                                        }}
                                      >
                                        {event.title}
                                      </div>
                                    </HoverCardTrigger>
                                    {booking && (
                                      <HoverCardContent className="w-80" align="start" side="right">
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
                                                <span className="text-green-600">{(() => {
                                                  const amountDisplay = getBookingAmountDisplayText(booking, settings);
                                                  return amountDisplay.subtitle 
                                                    ? `${amountDisplay.main} ${amountDisplay.subtitle}`
                                                    : amountDisplay.main;
                                                })()}</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="pt-2 border-t space-y-2">
                                            <Badge className={getStatusColor(booking.status || 'new')}>
                                              {booking.status?.replace('_', ' ') || 'New'}
                                            </Badge>
                                            {/* Document indicator - includes both new and legacy documents */}
                                            <BookingDocumentIndicator 
                                              bookingId={booking.id}
                                              booking={booking}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openDocumentManagerDialog(booking);
                                              }}
                                            />
                                            {/* Compliance indicator - shows available compliance documents */}
                                            <ComplianceIndicator 
                                              bookingId={booking.id}
                                              booking={booking}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openComplianceDialog(booking);
                                              }}
                                            />
                                            
                                            <div className="flex items-center gap-2">
                                              {/* Apply on Encore Button - only show for Encore bookings */}
                                              {booking.applyNowLink && (
                                                <Button 
                                                  size="sm" 
                                                  variant="outline"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(booking.applyNowLink, '_blank');
                                                  }}
                                                  className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                                                >
                                                  Apply on Encore
                                                </Button>
                                              )}
                                            </div>
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
                                    <HoverCard 
                                      key={eventIndex} 
                                      openDelay={200} 
                                      closeDelay={3000}
                                    >
                                      <HoverCardTrigger asChild>
                                        <div
                                          className={`text-xs p-1 rounded truncate cursor-pointer ${getStatusColor(event.status || 'new')} ${
                                            highlightedBookingId === event.id.toString() ? 'ring-2 ring-yellow-400 ring-offset-1 shadow-lg' : ''
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (booking) {
                                              navigateToEditBooking(booking);
                                            }
                                          }}
                                        >
                                          {event.title}
                                        </div>
                                      </HoverCardTrigger>
                                      {booking && (
                                        <HoverCardContent className="w-80" align="start" side="right">
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
                                                  <span className="text-green-600">{(() => {
                                                    const amountDisplay = getBookingAmountDisplayText(booking, settings);
                                                    return amountDisplay.subtitle 
                                                      ? `${amountDisplay.main} ${amountDisplay.subtitle}`
                                                      : amountDisplay.main;
                                                  })()}</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="pt-2 border-t space-y-2">
                                              <Badge className={getStatusColor(booking.status || 'new')}>
                                                {booking.status?.replace('_', ' ') || 'New'}
                                              </Badge>
                                              {/* Document indicator - legacy single document */}
                                              {booking.documentUrl && booking.documentUrl.trim() && (
                                                <Badge 
                                                  variant="outline" 
                                                  className="text-xs cursor-pointer hover:bg-green-50 hover:border-green-300"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openManageDocuments(booking);
                                                  }}
                                                  title="Click to manage documents"
                                                >
                                                  <Paperclip className="h-3 w-3 mr-1" />
                                                  Document (Legacy)
                                                </Badge>
                                              )}
                                              {/* Document indicator - includes both new and legacy documents */}
                                              <BookingDocumentIndicator 
                                                bookingId={booking.id}
                                                booking={booking}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openDocumentManagerDialog(booking);
                                                }}
                                              />
                                              {/* Compliance indicator - shows available compliance documents */}
                                              <ComplianceIndicator 
                                                bookingId={booking.id}
                                                booking={booking}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openComplianceDialog(booking);
                                                }}
                                              />
                                              
                                              <div className="flex items-center gap-2">
                                                {/* Apply on Encore Button - only show for Encore bookings */}
                                                {booking.applyNowLink && (
                                                  <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      window.open(booking.applyNowLink, '_blank');
                                                    }}
                                                    className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                                                  >
                                                    Apply on Encore
                                                  </Button>
                                                )}
                                              </div>
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
      {/* BookingDetailsDialog removed - using new-booking page for all editing */}
      
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

      {/* Document Manager Dialog */}
      <BookingDocumentsManager
        booking={selectedBookingForDocument}
        isOpen={documentUploadDialogOpen}
        onClose={() => {
          setDocumentUploadDialogOpen(false);
          setSelectedBookingForDocument(null);
        }}
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

      {/* Communication History Dialog */}
      <Dialog 
        open={communicationHistoryDialogOpen} 
        onOpenChange={setCommunicationHistoryDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Communication History - {selectedBookingForCommunications?.clientName || 'Client'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedBookingForCommunications && (
              <CommunicationHistory
                bookingId={selectedBookingForCommunications.id}
                clientEmail={selectedBookingForCommunications.clientEmail}
                showHeader={false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Individual Delete Confirmation Dialog */}
      <AlertDialog open={singleDeleteDialogOpen} onOpenChange={setSingleDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the booking "{selectedBookingForDeletion?.eventType || 'Event'}" 
              for {selectedBookingForDeletion?.clientName || 'Unknown Client'}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeSingleDeleteDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSingleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
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
      
      {/* Full-Screen Calendar Modal */}
      <Dialog 
        open={fullScreenCalendarOpen} 
        onOpenChange={setFullScreenCalendarOpen}
      >
        <DialogContent 
          className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0 luminance-aware"
          style={{ width: '95vw', height: '95vh' }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              const newDate = new Date(fullScreenCurrentDate);
              newDate.setMonth(newDate.getMonth() - 1);
              setFullScreenCurrentDate(newDate);
            } else if (e.key === 'ArrowRight') {
              e.preventDefault();
              const newDate = new Date(fullScreenCurrentDate);
              newDate.setMonth(newDate.getMonth() + 1);
              setFullScreenCurrentDate(newDate);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              const newDate = new Date(fullScreenCurrentDate);
              newDate.setFullYear(newDate.getFullYear() - 1);
              setFullScreenCurrentDate(newDate);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              const newDate = new Date(fullScreenCurrentDate);
              newDate.setFullYear(newDate.getFullYear() + 1);
              setFullScreenCurrentDate(newDate);
            } else if (e.key === 'Home' || (e.metaKey && e.key === 'ArrowLeft') || e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFullScreenCurrentDate(new Date());
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setFullScreenCalendarOpen(false);
            }
          }}
          tabIndex={0}
          onOpenAutoFocus={(e) => {
            // Allow auto-focus but ensure it focuses on the dialog container
            const target = e.currentTarget as HTMLElement;
            if (target) {
              target.focus();
            }
          }}
        >

          
          <div className="flex-1 overflow-hidden p-4">
            {/* Full-Screen Calendar Grid without scrolling or navigation arrows */}
            <div className="h-full flex flex-col">
              {/* Month Header - Bold Theme Background */}
              <div className="flex items-center justify-center mb-6 flex-col relative">
                <div className="absolute inset-0 rounded-xl shadow-xl" style={{
                  backgroundColor: settings?.themeAccentColor || theme.colors.primary,
                  background: `linear-gradient(135deg, ${settings?.themeAccentColor || theme.colors.primary}ee, ${settings?.themeAccentColor || theme.colors.primary})`,
                  boxShadow: `0 8px 32px ${settings?.themeAccentColor || theme.colors.primary}40`
                }}></div>
                <div className="relative z-10 py-6 px-8">
                  <h2 className="text-5xl font-bold mb-4 text-center luminance-aware drop-shadow-lg">
                    {monthNames[fullScreenCurrentDate.getMonth()]} {fullScreenCurrentDate.getFullYear()}
                  </h2>
                  <div className="flex items-center justify-center">
                    <div className="text-xs font-medium px-4 py-2 rounded-full text-center luminance-aware-muted backdrop-blur-sm border border-white/20" style={{
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
                    }}>
                      ← → months • ↑ ↓ years • Enter/Space today • Esc close
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Day Headers - Full Theme Color Backgrounds with Luminance Aware Text */}
              <div className="grid grid-cols-7 gap-2 mb-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                  <div key={day} className="text-center font-bold py-4 text-sm rounded-lg shadow-md luminance-aware" style={{
                    backgroundColor: settings?.themeAccentColor || theme.colors.primary,
                    background: `linear-gradient(135deg, ${settings?.themeAccentColor || theme.colors.primary}, ${settings?.themeAccentColor || theme.colors.primary}dd)`,
                    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    boxShadow: `0 4px 12px ${settings?.themeAccentColor || theme.colors.primary}30`
                  }}>
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid - 6 Weeks (42 days) with Equal Row Heights */}
              <div className="grid grid-cols-7 grid-rows-6 gap-2 flex-1 min-h-0">
                {(() => {
                  // Generate calendar data for complete 6 weeks (42 days) to show full month context
                  // Monday-to-Sunday week layout for musicians (weekend work is common)
                  const firstDay = new Date(fullScreenCurrentDate.getFullYear(), fullScreenCurrentDate.getMonth(), 1);
                  const startDate = new Date(firstDay);
                  // Calculate days back to Monday: getDay() returns 0=Sunday, 1=Monday, etc.
                  // For Monday start: if Sunday (0), go back 6 days; if Monday (1), go back 0 days
                  const dayOfWeek = firstDay.getDay();
                  const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  startDate.setDate(startDate.getDate() - daysBack);
                  
                  const days = [];
                  for (let i = 0; i < 42; i++) { // 6 weeks = 42 days
                    const date = new Date(startDate);
                    date.setDate(startDate.getDate() + i);
                    const events = getEventsForDate(date);
                    const blockedDate = isDateBlocked(date);
                    days.push({
                      date,
                      day: date.getDate(),
                      events,
                      isCurrentMonth: date.getMonth() === fullScreenCurrentDate.getMonth(),
                      isToday: date.toDateString() === new Date().toDateString(),
                      blockedDate: blockedDate
                    });
                  }
                  
                  return days;
                })().map((day, index) => {
                  const isSelectedDate = fullScreenSelectedDate && 
                    day.date.toDateString() === fullScreenSelectedDate.toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`
                        p-3 cursor-pointer flex flex-col h-full rounded-xl transition-all duration-300 transform hover:scale-[1.02]
                        ${day.isCurrentMonth ? 'shadow-lg hover:shadow-xl' : 'opacity-70 hover:opacity-90'}
                        ${day.isToday ? 'shadow-2xl ring-4 ring-opacity-50' : ''}
                        ${isSelectedDate ? 'ring-4 ring-opacity-60 scale-[1.02]' : ''}
                      `}
                      style={{
                        background: day.isCurrentMonth 
                          ? (day.isToday 
                            ? `linear-gradient(135deg, ${settings?.themeAccentColor || theme.colors.primary}15, ${settings?.themeAccentColor || theme.colors.primary}25)`
                            : isSelectedDate
                            ? `linear-gradient(135deg, ${settings?.themeAccentColor || theme.colors.primary}20, ${settings?.themeAccentColor || theme.colors.primary}30)`
                            : 'linear-gradient(135deg, #ffffff, #f8fafc)')
                          : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                        border: day.isCurrentMonth 
                          ? `3px solid ${settings?.themeAccentColor || theme.colors.primary}60`
                          : '2px solid #cbd5e1',
                        ringColor: day.isToday || isSelectedDate
                          ? `${settings?.themeAccentColor || theme.colors.primary}50`
                          : undefined,
                        boxShadow: day.isToday 
                          ? `0 20px 25px -5px ${settings?.themeAccentColor || theme.colors.primary}30, 0 10px 10px -5px ${settings?.themeAccentColor || theme.colors.primary}15, inset 0 2px 4px ${settings?.themeAccentColor || theme.colors.primary}20`
                          : day.isCurrentMonth 
                          ? '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                      onClick={() => {
                        if (day.events.length > 0) {
                          const firstEvent = day.events[0];
                          const validBookings = validateBookingArray(bookings) ? bookings : [];
                          const booking = validBookings.find((b) => b.id === firstEvent.id);
                          if (booking) {
                            setFullScreenCalendarOpen(false);
                            navigateToEditBooking(booking);
                          }
                        } else {
                          // Create new booking for this date
                          const dateStr = day.date.toISOString().split('T')[0];
                          setFullScreenCalendarOpen(false);
                          navigate(`/new-booking?date=${dateStr}`);
                        }
                      }}
                    >
                      <div className={`font-bold mb-2 text-center ${
                        day.isCurrentMonth ? 'text-2xl' : 'text-lg text-gray-500'
                      }`} style={{
                        color: day.isCurrentMonth 
                          ? (day.isToday ? settings?.themeAccentColor || theme.colors.primary : '#1e293b')
                          : '#64748b',
                        textShadow: day.isToday ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                        fontWeight: day.isToday ? '900' : '700'
                      }}>
                        {day.day}
                      </div>
                      <div className="space-y-1 flex-1">
                        {/* Show blocked date indicator first */}
                        {day.blockedDate && (
                          <div 
                            className="px-2 py-1 rounded-md text-xs font-bold text-white text-center shadow-sm"
                            style={{ backgroundColor: day.blockedDate.color }}
                            title={day.blockedDate.description || day.blockedDate.title}
                          >
                            🚫 {day.blockedDate.title}
                          </div>
                        )}
                        
                        {day.events.slice(0, day.isCurrentMonth ? (day.blockedDate ? 2 : 3) : (day.blockedDate ? 1 : 2)).map((event, eventIndex) => {
                          const validBookings = validateBookingArray(bookings) ? bookings : [];
                          const booking = validBookings.find((b) => b.id === event.id);
                          
                          return (
                            <div
                              key={eventIndex}
                              className={`text-xs p-1 rounded truncate font-medium cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-sm ${
                                day.isCurrentMonth 
                                  ? getStatusColor(event.status || 'new')
                                  : 'bg-gray-300 text-gray-600'
                              } ${
                                highlightedBookingId === event.id.toString() ? 'ring-2 ring-yellow-400 ring-offset-1 shadow-lg' : ''
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (booking) {
                                  setFullScreenCalendarOpen(false);
                                  navigateToEditBooking(booking);
                                }
                              }}
                              onMouseEnter={(e) => {
                                if (booking) {
                                  // Clear any existing timeouts
                                  if (hideTimeout) {
                                    clearTimeout(hideTimeout);
                                    setHideTimeout(null);
                                  }
                                  
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const cardWidth = 320; // 80 * 4 = w-80 in Tailwind
                                  const cardHeight = 300; // Estimated height of hover card
                                  const viewportWidth = window.innerWidth;
                                  const viewportHeight = window.innerHeight;
                                  
                                  // Smart positioning logic
                                  let x = rect.right + 10;
                                  let y = rect.top;
                                  
                                  // If card would go off-screen to the right, place it to the left
                                  if (x + cardWidth > viewportWidth) {
                                    x = rect.left - cardWidth - 10;
                                  }
                                  
                                  // If card would go off-screen at the bottom, move it up
                                  if (y + cardHeight > viewportHeight) {
                                    y = viewportHeight - cardHeight - 20; // 20px padding from bottom
                                  }
                                  
                                  // Ensure card doesn't go above the viewport
                                  if (y < 20) {
                                    y = 20; // 20px padding from top
                                  }
                                  
                                  setHoverCardPosition({ x, y });
                                  setHoveredBooking(booking);
                                  
                                  // Longer delay before showing (600ms)
                                  const timeout = setTimeout(() => setHoverCardVisible(true), 600);
                                  setHoverTimeout(timeout);
                                }
                              }}
                              onMouseLeave={() => {
                                // Clear show timeout if still pending
                                if (hoverTimeout) {
                                  clearTimeout(hoverTimeout);
                                  setHoverTimeout(null);
                                }
                                
                                // Longer delay before hiding (1.5 seconds for user to move to hover card)
                                const timeout = setTimeout(() => {
                                  setHoverCardVisible(false);
                                  setTimeout(() => setHoveredBooking(null), 100);
                                }, 1500);
                                setHideTimeout(timeout);
                              }}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {day.events.length > (day.isCurrentMonth ? 3 : 2) && (
                          <div className="text-xs text-gray-500 font-medium text-center mt-1">
                            +{day.events.length - (day.isCurrentMonth ? 3 : 2)} more
                          </div>
                        )}
                        {day.events.length === 0 && day.isCurrentMonth && (
                          <div className="text-xs text-gray-400 italic text-center mt-2 opacity-50">
                            + Add booking
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portal-based Hover Card */}
      {hoveredBooking && hoverCardVisible && createPortal(
        <div 
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80"
          style={{ 
            left: hoverCardPosition.x, 
            top: hoverCardPosition.y, 
            zIndex: 9999998,
            pointerEvents: 'auto'
          }}
          onMouseEnter={() => {
            // Clear any hide timeout when hovering over the card
            if (hideTimeout) {
              clearTimeout(hideTimeout);
              setHideTimeout(null);
            }
            setHoverCardVisible(true);
          }}
          onMouseLeave={() => {
            // Start hide timer when leaving the hover card
            const timeout = setTimeout(() => {
              setHoverCardVisible(false);
              setTimeout(() => setHoveredBooking(null), 100);
            }, 300);
            setHideTimeout(timeout);
          }}
          // Add key to force remount and prevent stale state
          key={hoveredBooking?.id}
        >
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{hoveredBooking.eventType || 'Event'}</h4>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-gray-500" />
                <span className="font-medium">Client:</span>
                <span>{hoveredBooking.clientName || 'Unknown'}</span>
              </div>
              {hoveredBooking.venue && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-gray-500" />
                  <span className="font-medium">Venue:</span>
                  <span>{hoveredBooking.venue}</span>
                </div>
              )}
              {hoveredBooking.venueAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-gray-500 mt-1" />
                  <span className="font-medium">Address:</span>
                  <span className="flex-1">{hoveredBooking.venueAddress}</span>
                </div>
              )}
              {hoveredBooking.eventTime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className="font-medium">Time:</span>
                  <span>{hoveredBooking.eventTime}</span>
                </div>
              )}
              {hoveredBooking.fee && (
                <div className="flex items-center gap-2">
                  <PoundSterling className="w-3 h-3 text-gray-500" />
                  <span className="font-medium">Fee:</span>
                  <span className="text-green-600">£{hoveredBooking.fee}</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t space-y-2">
              <Badge className={getStatusColor(hoveredBooking.status || 'new')}>
                {hoveredBooking.status?.replace('_', ' ') || 'New'}
              </Badge>
              
              <div className="flex items-center gap-2">
                {/* Hover-based Respond Menu */}
                <HoverResponseMenu 
                  booking={hoveredBooking}
                  onAction={(action, booking) => {
                    console.log('Action triggered:', action, 'for booking:', booking.id);
                    
                    // Clear ALL state before action
                    setHoverCardVisible(false);
                    setHoveredBooking(null);
                    setFullScreenCalendarOpen(false);
                    
                    if (hideTimeout) {
                      clearTimeout(hideTimeout);
                      setHideTimeout(null);
                    }
                    if (hoverTimeout) {
                      clearTimeout(hoverTimeout);
                      setHoverTimeout(null);
                    }
                    
                    // Handle the action
                    switch (action) {
                      case 'edit':
                        // Delay to ensure all state clears before navigation
                        setTimeout(() => {
                          console.log('Navigating to edit booking:', booking.id);
                          navigateToEditBooking(booking);
                        }, 200);
                        break;
                      case 'delete':
                        openDeleteDialog(booking);
                        break;
                      case 'respond':
                        // Delay to ensure all state clears before navigation
                        setTimeout(() => {
                          console.log('Navigating to templates for respond:', booking.id);
                          navigate(`/templates?bookingId=${booking.id}&action=respond`);
                        }, 200);
                        break;
                      case 'contract':
                        // Delay to ensure all state clears before navigation
                        setTimeout(() => {
                          console.log('Navigating to contracts for creation:', booking.id);
                          navigate(`/contracts?bookingId=${booking.id}&action=create`);
                        }, 200);
                        break;
                      case 'invoice':
                        // Delay to ensure all state clears before navigation
                        setTimeout(() => {
                          console.log('Navigating to invoices for creation:', booking.id);
                          navigate(`/invoices?create=true&bookingId=${booking.id}`);
                        }, 200);
                        break;
                      case 'thankyou':
                        // Delay to ensure all state clears before navigation
                        setTimeout(() => {
                          console.log('Navigating to templates for thankyou:', booking.id);
                          navigate(`/templates?bookingId=${booking.id}&action=thankyou`);
                        }, 200);
                        break;
                      case 'send_compliance':
                        setSelectedBookingForCompliance(booking);
                        setComplianceDialogOpen(true);
                        break;
                      case 'manage_documents':
                        setSelectedBookingForDocument(booking);
                        setDocumentUploadDialogOpen(true);
                        break;
                      default:
                        // Status change (like rejected)
                        statusChangeMutation.mutate({
                          bookingId: booking.id,
                          status: action
                        });
                        break;
                    }
                  }}
                />
                
                {/* Apply on Encore Button */}
                {hoveredBooking.applyNowLink && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(hoveredBooking.applyNowLink, '_blank');
                    }}
                    className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                  >
                    Apply on Encore
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Navigation */}
      {!isDesktop && <MobileNav />}
    </div>
  );
}