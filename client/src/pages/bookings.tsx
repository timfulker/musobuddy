import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Calendar, List, Search, Plus, ChevronLeft, ChevronRight, Menu, Upload, Download, Clock, User, PoundSterling, Trash2, CheckSquare, Square, MoreHorizontal, FileText, Receipt, Crown, Lock, MapPin, Filter, X, ChevronDown, Settings, Paperclip, MessageCircle, Edit, Eye, Reply, ThumbsUp, Shield, XCircle, MessageSquare, DollarSign, Mail, CreditCard, Users } from "lucide-react";
import { useLocation, Link, useRoute } from "wouter";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useResponsive } from "@/hooks/useResponsive";
import { useAuthContext } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { getOptimalTextColor, getMutedTextColor } from "@/lib/luminance";
import { calculateBookingDisplayTotal, getBookingAmountDisplayText } from "@/utils/booking-calculations";
// BookingDetailsDialog removed - using new-booking page for all editing
import BookingStatusDialog from "@/components/BookingStatusDialog";
import CalendarImport from "@/components/calendar-import";
import { SimpleCalendarImport } from "@/components/simple-calendar-import";
import { FixedCalendarImport } from "@/components/fixed-calendar-import";

import HoverResponseMenu from "@/components/hover-response-menu";
import { SendComplianceDialog } from "@/components/SendComplianceDialog";
import ConflictIndicator from "@/components/ConflictIndicator";
import ConflictResolutionDialog from "@/components/ConflictResolutionDialog";
import { ComplianceIndicator } from "@/components/compliance-indicator";
import { CommunicationHistory } from "@/components/communication-history";
import WorkflowStageMeter from "@/components/workflow-stage-meter";
import { BandContextMenu } from "@/components/BandContextMenu";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Enquiry } from "@shared/schema";
import { validateBookingArray, safeGet, safeGetString } from "@shared/validation";
import { WORKFLOW_STAGES, getStageDefinition, getStageProgress, getStageColor, determineCurrentStage, type WorkflowStage } from "../../../shared/workflow-stages";

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
  const { user } = useAuthContext();
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

  // Fetch user's bands for color coding
  const { data: bands = [] } = useQuery({
    queryKey: ['/api/bands'],
  });
  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  


  // Helper function to get band color by ID
  const getBandById = (bandId: number | null) => {
    if (!bandId) return null;
    return bands.find((band: any) => band.id === bandId);
  };

  // Status color helper function - now with band color override option
  const getStatusBorderColor = (status: string, bandId?: number | null, showBandColors = true) => {
    // If band colors are enabled and booking has a band, use band color
    if (showBandColors && bandId) {
      const band = getBandById(bandId);
      if (band) {
        return `border-l-4`;
      }
    }

    // Fall back to status colors
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

  // Helper function to get band color style for left border
  const getBandBorderStyle = (bandId: number | null) => {
    const band = getBandById(bandId);
    if (band) {
      return { borderLeftColor: band.color };
    }
    return {};
  };

  // Handler for right-click context menu
  const handleBookingRightClick = (e: React.MouseEvent, booking: any) => {
    e.preventDefault();
    e.stopPropagation();

    setBandContextMenu({
      isVisible: true,
      bookingId: booking.id,
      currentBandId: booking.bandId || null,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  // Close band context menu
  const closeBandContextMenu = () => {
    setBandContextMenu({
      isVisible: false,
      bookingId: null,
      currentBandId: null,
      position: { x: 0, y: 0 }
    });
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
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

  // Band context menu state
  const [bandContextMenu, setBandContextMenu] = useState<{
    isVisible: boolean;
    bookingId: number | null;
    currentBandId: number | null;
    position: { x: number; y: number };
  }>({
    isVisible: false,
    bookingId: null,
    currentBandId: null,
    position: { x: 0, y: 0 }
  });

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

  // Debounce search query to prevent constant reloading while typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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

  // Auto-switch view mode based on orientation on mobile devices
  useEffect(() => {
    if (!isDesktop) {
      const handleOrientationChange = () => {
        const isLandscape = window.innerHeight < window.innerWidth;
        const newViewMode = isLandscape ? 'calendar' : 'list';
        setViewMode(newViewMode);
        localStorage.setItem('bookingViewMode', newViewMode);
      };

      // Set initial view based on current orientation
      handleOrientationChange();

      // Listen for orientation changes
      window.addEventListener('resize', handleOrientationChange);
      
      return () => {
        window.removeEventListener('resize', handleOrientationChange);
      };
    }
  }, [isDesktop]);

  // Invoice status helpers
  const getInvoiceForBooking = (bookingId: number) => {
    return invoices.find((invoice: any) => invoice.bookingId === bookingId);
  };

  const getInvoiceStatusIcon = (bookingId: number) => {
    const invoice = getInvoiceForBooking(bookingId);
    
    if (!invoice || invoice.status === 'draft') {
      return null; // Don't show if no invoice or still draft
    }

    if (invoice.status === 'paid') {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
          <CreditCard className="w-3 h-3 mr-1" />
          Invoice Paid
        </Badge>
      );
    }

    if (invoice.status === 'sent' || invoice.status === 'overdue') {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
          <Mail className="w-3 h-3 mr-1" />
          Invoice Sent
        </Badge>
      );
    }

    return null;
  };

  // Determine if we should fetch ALL bookings (when searching/filtering)
  // Note: We need to fetch all bookings when conflictFilter is true to detect conflicts
  const shouldFetchAll = debouncedSearchQuery.length >= 2 || statusFilter !== 'all' ||
                         dateFilter !== 'all' || conflictFilter;

  // Build query parameters for the all endpoint
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.append('search', debouncedSearchQuery);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (dateFilter !== 'all') params.append('dateFilter', dateFilter);
    // Note: hasConflict is passed but not implemented on backend yet
    // Conflict filtering happens on frontend for now
    if (conflictFilter) params.append('hasConflict', 'true');
    // Don't apply limit when actively searching/filtering or checking conflicts
    if (debouncedSearchQuery || statusFilter !== 'all' || dateFilter !== 'all' || conflictFilter) {
      params.append('applyLimit', 'false');
    }
    return params.toString();
  };

  // Fetch data - use different endpoint based on whether we're searching/filtering
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useQuery({
    queryKey: shouldFetchAll 
      ? ["/api/bookings/all", debouncedSearchQuery, statusFilter, dateFilter, conflictFilter]
      : ["/api/bookings"],
    retry: 2,
    queryFn: async () => {
      const endpoint = shouldFetchAll 
        ? `/api/bookings/all?${buildQueryParams()}`
        : '/api/bookings';
      
      // Log what we're fetching
      console.log(`🎯 Attempting to fetch from: ${endpoint}`);
      console.log(`🎯 shouldFetchAll=${shouldFetchAll}, search="${debouncedSearchQuery}", status=${statusFilter}, date=${dateFilter}`);
      
      const response = await apiRequest(endpoint);
      
      if (!response.ok) {
        console.error(`❌ Failed to fetch bookings: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error(`❌ Error response:`, errorText);
        throw new Error(`Failed to fetch bookings: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Log what we got
      if (shouldFetchAll) {
        console.log(`🔍 Got ${data.length} bookings from ALL endpoint`);
      } else {
        console.log(`✅ Got ${data.length} bookings from default endpoint`);
      }
      
      return data;
    },
  }) as { data: Enquiry[], isLoading: boolean, error: any };

  // Log any query errors
  useEffect(() => {
    if (bookingsError) {
      console.error('❌ Bookings query error:', bookingsError);
    }
  }, [bookingsError]);

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

    // Performance optimization: Only check conflicts for upcoming bookings (next year)
    const today = new Date();
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    // Group bookings by date for efficient lookup
    const validBookings = validateBookingArray(bookings) ? bookings : [];
    validBookings.forEach((booking) => {
      if (!booking.eventDate || booking.status === 'cancelled' || booking.status === 'rejected') return;

      // Skip conflict detection for old bookings (performance optimization)
      const bookingDate = new Date(booking.eventDate);
      if (bookingDate < today || bookingDate > oneYearFromNow) return;
      
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
    
    // If we're using the /all endpoint with filters, the server already filtered
    // So we only need to apply frontend filtering for the default view
    if (shouldFetchAll) {
      // Server already filtered, just sort
      return validBookings;
    }
    
    // Apply frontend filtering only for default view
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
      
      // Conflict filtering - only show bookings that have conflicts when filter is enabled
      let matchesConflict = true;
      if (conflictFilter) {
        const conflicts = detectConflicts(booking);
        matchesConflict = conflicts.length > 0;
      }

      return matchesSearch && matchesStatus && matchesDate && matchesConflict;
    });

    // Sort the results (whether server-filtered or client-filtered)
    const toSort = shouldFetchAll ? validBookings : filtered;
    toSort.sort((a: any, b: any) => {
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

    return shouldFetchAll ? toSort : filtered;
  }, [bookings, searchQuery, debouncedSearchQuery, statusFilter, dateFilter, conflictFilter, sortField, sortDirection]);

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

  // Bulk band assignment mutation
  const bandAssignMutation = useMutation({
    mutationFn: async ({ bookingIds, bandId }: { bookingIds: number[], bandId: number | null }) => {
      const promises = bookingIds.map(id =>
        apiRequest(`/api/bookings/${id}/band`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bandId })
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      setSelectedBookings([]);
      toast({
        title: "Success",
        description: `${selectedBookings.length} booking(s) assigned to band successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign band to bookings",
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

  // ICS Export functionality
  const generateICSFile = () => {
    if (!bookings || bookings.length === 0) {
      toast({
        title: "No Bookings to Export",
        description: "There are no bookings to export at this time",
        variant: "destructive",
      });
      return;
    }

    const validBookings = validateBookingArray(bookings) ? bookings : [];
    
    // Helper function to format date for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (dateStr: string, timeStr?: string) => {
      const date = new Date(dateStr);
      
      if (timeStr && timeStr !== 'Time not specified' && timeStr.trim() !== '') {
        // Parse time string and set it on the date
        try {
          const cleanTime = timeStr.toLowerCase().replace(/[^\d:apm\-]/g, '');
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
          
          date.setHours(hours, minutes, 0, 0);
        } catch (error) {
          // If time parsing fails, use default time
          date.setHours(19, 0, 0, 0); // Default to 7 PM
        }
      } else {
        // Default time if no specific time provided
        date.setHours(19, 0, 0, 0); // Default to 7 PM
      }
      
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    // Helper to calculate end time
    const formatICSEndDate = (dateStr: string, timeStr?: string, endTimeStr?: string, durationStr?: string) => {
      const startDate = new Date(dateStr);
      
      if (endTimeStr && endTimeStr !== 'Time not specified' && endTimeStr.trim() !== '') {
        // Use provided end time
        try {
          const cleanTime = endTimeStr.toLowerCase().replace(/[^\d:apm\-]/g, '');
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
          
          startDate.setHours(hours, minutes, 0, 0);
        } catch (error) {
          startDate.setHours(22, 0, 0, 0); // Default to 10 PM
        }
      } else {
        // Calculate end time from start time and duration or use default
        let durationHours = 3; // Default 3 hours
        
        if (durationStr) {
          const durationMatch = durationStr.match(/(\d+)/);
          if (durationMatch) {
            durationHours = parseInt(durationMatch[1], 10);
          }
        }
        
        // Set start time first
        if (timeStr && timeStr !== 'Time not specified' && timeStr.trim() !== '') {
          try {
            const cleanTime = timeStr.toLowerCase().replace(/[^\d:apm\-]/g, '');
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
            
            startDate.setHours(hours, minutes, 0, 0);
          } catch (error) {
            startDate.setHours(19, 0, 0, 0);
          }
        } else {
          startDate.setHours(19, 0, 0, 0);
        }
        
        // Add duration
        startDate.setHours(startDate.getHours() + durationHours);
      }
      
      return startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    // Helper to escape special characters in ICS
    const escapeICS = (text: string) => {
      if (!text) return '';
      return text
        .replace(/\\/g, '\\\\')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');
    };

    // Generate ICS content
    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MusoBuddy//Booking Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    validBookings.forEach((booking) => {
      if (!booking.eventDate) return;

      const startDateTime = formatICSDate(booking.eventDate, booking.eventTime);
      const endDateTime = formatICSEndDate(booking.eventDate, booking.eventTime, booking.eventEndTime, booking.performanceDuration);
      
      // Create event title
      const eventTitle = escapeICS(`${booking.clientName || 'Unknown Client'} - ${booking.gigType || 'Booking'}`);
      
      // Create location string
      const location = escapeICS(booking.venue || booking.venueAddress || 'Venue TBC');
      
      // Create description with booking details
      const descriptionParts = [
        `Client: ${booking.clientName || 'N/A'}`,
        booking.clientEmail ? `Email: ${booking.clientEmail}` : '',
        booking.clientPhone ? `Phone: ${booking.clientPhone}` : '',
        booking.gigType ? `Type: ${booking.gigType}` : '',
        booking.eventType ? `Event: ${booking.eventType}` : '',
        booking.fee ? `Fee: £${booking.fee}` : '',
        booking.equipmentRequirements ? `Equipment: ${booking.equipmentRequirements}` : '',
        booking.specialRequirements ? `Special Requirements: ${booking.specialRequirements}` : '',
        booking.styles ? `Music Style: ${booking.styles}` : '',
        booking.mustPlaySongs ? `Must Play: ${booking.mustPlaySongs}` : '',
        booking.venueContactInfo ? `Venue Contact: ${booking.venueContactInfo}` : '',
        `Status: ${booking.status || 'new'}`,
        `Booking ID: ${booking.id}`
      ].filter(Boolean).join('\\n');

      const description = escapeICS(descriptionParts);

      // Generate unique ID for the event
      const uid = `booking-${booking.id}@musobuddy.com`;

      icsContent.push(
        'BEGIN:VEVENT',
        `DTSTART:${startDateTime}`,
        `DTEND:${endDateTime}`,
        `SUMMARY:${eventTitle}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        `UID:${uid}`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
        `STATUS:${booking.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    // Create and download the file
    const icsData = icsContent.join('\r\n');
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `musobuddy-bookings-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Calendar Exported",
      description: `Successfully exported ${validBookings.length} bookings to ICS file`,
    });
  };
  
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
  const getStatusColor = (status: string, bandId?: number | null, showBandColors = true) => {
    // Check if band colors are enabled and event has a band
    if (showBandColors && bandId && settings?.showBandColors !== false) {
      const band = getBandById(bandId);
      if (band) {
        // Use band color for calendar events with increased opacity
        return ''; // Return empty string so we can use inline style
      }
    }

    // Fall back to status colors
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

  // Helper to get calendar event style for band colors
  const getCalendarEventStyle = (bandId: number | null, showBandColors = true) => {
    if (showBandColors && bandId && settings?.showBandColors !== false) {
      const band = getBandById(bandId);
      if (band) {
        // Create lighter version for background and darker for text
        const hexToRgb = (hex: string) => {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          } : null;
        };

        const rgb = hexToRgb(band.color);
        if (rgb) {
          return {
            backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)`,
            color: band.color,
            borderLeft: `3px solid ${band.color}`
          };
        }
      }
    }
    return {};
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

    // Ensure we're parsing the timestamp as UTC by ensuring it has a 'Z' suffix
    // Server stores timestamps as UTC ISO strings, but sometimes without 'Z'
    let utcDateString = dateString;
    if (!dateString.endsWith('Z') && !dateString.includes('+') && !dateString.includes('-', 10)) {
      utcDateString = dateString + 'Z';
    }

    // Parse the UTC timestamp - this will automatically convert to local time
    const date = new Date(utcDateString);
    const now = new Date();

    // Calculate difference in milliseconds, then convert to minutes/hours
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    // Use relative time formatting for recent times
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      // For older dates, show the local date/time
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
        <div className={`${isDesktop ? "h-screen" : "min-h-screen"} flex flex-col transition-all duration-300 ${isDesktop ? "ml-64" : ""}`}>
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
      <div className={`${isDesktop ? "h-screen" : "min-h-screen"} flex flex-col transition-all duration-300 ${isDesktop ? "ml-64" : ""} ${!isDesktop ? "pb-20" : ""}`}>
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
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-700/80 text-sm font-medium">This Week</p>
                              <p className="text-3xl font-bold text-blue-900">
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
                              <p className="text-sm text-blue-600 mt-1 flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                Confirmed bookings
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                              <Calendar className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-green-700/80 text-sm font-medium">Confirmed</p>
                              <p className="text-3xl font-bold text-green-900">
                                {(bookings || []).filter((b: any) => b.status === "confirmed").length}
                              </p>
                              <p className="text-sm text-green-600 mt-1 flex items-center">
                                <CheckSquare className="w-4 h-4 mr-1" />
                                Ready to perform
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                              <CheckSquare className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-orange-700/80 text-sm font-medium">Pending</p>
                              <p className="text-3xl font-bold text-orange-900">
                                {(bookings || []).filter((b: any) => b.status === "in_progress" || b.status === "new").length}
                              </p>
                              <p className="text-sm text-orange-600 mt-1 flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                Awaiting response
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md">
                              <Clock className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-700/80 text-sm font-medium">Total Revenue</p>
                              <p className="text-3xl font-bold text-purple-900">
                                £{(bookings || []).filter((b: any) => b.status !== 'rejected' && b.status !== 'cancelled').reduce((sum: number, b: any) => sum + (parseFloat(b.fee) || 0), 0).toLocaleString()}
                              </p>
                              <p className="text-sm text-purple-600 mt-1 flex items-center">
                                <PoundSterling className="w-4 h-4 mr-1" />
                                From active bookings
                              </p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                              <PoundSterling className="w-6 h-6 text-white" />
                            </div>
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
                          Conflicts Only
                        </label>
                      </div>

                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchQuery("");
                          setDebouncedSearchQuery("");
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
                      Conflicts Only
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
                  <div className="flex flex-col gap-2 text-sm">
                    <span className="font-medium text-gray-700">Sort by:</span>
                    <div className="flex flex-wrap gap-2">
                      {/* First row of sort buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant={sortField === 'eventDate' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSort('eventDate')}
                          className="h-8 flex-shrink-0"
                        >
                          Date {sortField === 'eventDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </Button>
                        <Button
                          variant={sortField === 'clientName' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSort('clientName')}
                          className="h-8 flex-shrink-0"
                        >
                          Client {sortField === 'clientName' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </Button>
                        <Button
                          variant={sortField === 'fee' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSort('fee')}
                          className="h-8 flex-shrink-0"
                        >
                          Fee {sortField === 'fee' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </Button>
                      </div>
                      {/* Second row of sort buttons */}
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant={sortField === 'status' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSort('status')}
                          className="h-8 flex-shrink-0"
                        >
                          Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </Button>
                        <Button
                          variant={sortField === 'venue' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSort('venue')}
                          className="h-8 flex-shrink-0"
                        >
                          Venue {sortField === 'venue' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </Button>
                        <Button
                          variant={sortField === 'createdAt' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleSort('createdAt')}
                          className="h-8 flex-shrink-0"
                        >
                          Date Added {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </Button>
                      </div>
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
                        setDebouncedSearchQuery('');
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
                        {/* Band Assignment Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Users className="w-4 h-4 mr-2" />
                              Assign Band
                              <ChevronDown className="w-4 h-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => bandAssignMutation.mutate({
                                bookingIds: selectedBookings,
                                bandId: null
                              })}
                              disabled={bandAssignMutation.isPending}
                            >
                              <span className="text-gray-600">No Band</span>
                            </DropdownMenuItem>
                            {bands.map((band: any) => (
                              <DropdownMenuItem
                                key={band.id}
                                onClick={() => bandAssignMutation.mutate({
                                  bookingIds: selectedBookings,
                                  bandId: band.id
                                })}
                                disabled={bandAssignMutation.isPending}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-sm"
                                    style={{ backgroundColor: band.color }}
                                  />
                                  <span>{band.name}</span>
                                  {band.isDefault && (
                                    <span className="text-xs text-gray-500">(Default)</span>
                                  )}
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Change Status Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Change Status
                              <ChevronDown className="w-4 h-4 ml-2" />
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
                                      {isResolved ? '✅ Resolved Conflict Group' : '⚠️ Conflict Group'} - {new Date(booking.eventDate).toLocaleDateString('en-GB', { timeZone: 'UTC' })}
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
                                        className={`relative hover:shadow-lg transition-all duration-300 border-l-4 shadow-sm rounded-lg border border-gray-100 ${getStatusBorderColor(groupBooking.status, groupBooking.bandId, settings?.showBandColors)} ${
                                          selectedBookings.includes(groupBooking.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                                        } ${index < visibleGroupBookings.length - 1 ? 'border-b border-gray-100' : ''}`}
                                        style={settings?.showBandColors && groupBooking.bandId ? getBandBorderStyle(groupBooking.bandId) : {}}
                                        onContextMenu={(e) => handleBookingRightClick(e, groupBooking)}
                                      >
                                        <CardContent className={`${isDesktop ? 'p-6' : 'p-4'}`}>
                                          {/* Mobile Design: Square Card with Dense Information */}
                                          {!isDesktop ? (
                                            <div className="space-y-3">
                                              {/* Header Row - Date and Status */}
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                  <div className="bg-primary/10 rounded-lg px-3 py-2 text-center min-w-[60px]">
                                                    <div className="text-xl font-bold text-primary">
                                                      {format(new Date(groupBooking.eventDate), 'd')}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground uppercase font-medium">
                                                      {format(new Date(groupBooking.eventDate), 'MMM')}
                                                    </div>
                                                  </div>
                                                  <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      <span className={`inline-block w-2 h-2 rounded-full ${
                                                        groupBooking.status === 'new' ? 'bg-blue-500' :
                                                        groupBooking.status === 'confirmed' ? 'bg-green-500' :
                                                        groupBooking.status === 'in_progress' ? 'bg-orange-500' :
                                                        groupBooking.status === 'completed' ? 'bg-gray-500' :
                                                        'bg-gray-400'
                                                      }`} />
                                                      <span className="text-xs uppercase font-medium text-muted-foreground tracking-wide">
                                                        {groupBooking.status.replace('_', ' ')}
                                                      </span>
                                                      {groupBooking.applyNowLink && (
                                                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300 px-1 py-0">
                                                          🎵
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <h3 className="font-semibold text-base line-clamp-1 text-foreground">
                                                      {groupBooking.venue || groupBooking.clientName || 'Event'}
                                                    </h3>
                                                  </div>
                                                </div>
                                                
                                                {/* Action Menu */}
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                      <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                      <Link href={`/bookings?id=${groupBooking.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" />
                                                        View/Edit
                                                      </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/conversation/${groupBooking.id}`);
                                                      }}
                                                    >
                                                      <MessageCircle className="mr-2 h-4 w-4" />
                                                      Conversation
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </div>
                                              
                                              {/* Information Grid */}
                                              <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="space-y-1">
                                                  {groupBooking.clientName && groupBooking.venue && (
                                                    <div className="flex items-center gap-1">
                                                      <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                                      <span className="text-muted-foreground truncate text-xs">{groupBooking.clientName}</span>
                                                    </div>
                                                  )}
                                                  {groupBooking.eventTime && (
                                                    <div className="flex items-center gap-1">
                                                      <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                                      <span className="text-xs font-medium">{groupBooking.eventTime}</span>
                                                    </div>
                                                  )}
                                                  {groupBooking.venue && groupBooking.venueAddress && (
                                                    <div className="flex items-center gap-1">
                                                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                                      <span className="text-xs text-muted-foreground truncate">{groupBooking.venueAddress.split(',')[0]}</span>
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="space-y-1 text-right">
                                                  {groupBooking.fee && (
                                                    <div className="flex items-center justify-end gap-1">
                                                      <PoundSterling className="w-3 h-3 text-green-600 flex-shrink-0" />
                                                      <span className="text-xs font-semibold text-green-600">
                                                        {(() => {
                                                          const amountDisplay = getBookingAmountDisplayText(groupBooking, settings);
                                                          return amountDisplay.main;
                                                        })()}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {groupBooking.createdAt && (
                                                    <div className="text-xs text-muted-foreground">
                                                      {formatReceivedTime(groupBooking.createdAt)}
                                                    </div>
                                                  )}
                                                  {getInvoiceStatusIcon(groupBooking.id) && (
                                                    <div className="flex justify-end">
                                                      {getInvoiceStatusIcon(groupBooking.id)}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {/* Encore Apply Button - if present */}
                                              {groupBooking.applyNowLink && (
                                                <div className="pt-2 border-t border-gray-100">
                                                  <div className="flex items-center justify-between">
                                                    <Button
                                                      variant="outline"
                                                      size="sm"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(groupBooking.applyNowLink, '_blank');
                                                      }}
                                                      className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 text-xs px-2 py-1 h-7"
                                                    >
                                                      🎵 {groupBooking.status === 'new' ? 'Apply on Encore' : 'Applied'}
                                                    </Button>
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-xs text-gray-600">Applied:</span>
                                                      <Switch
                                                        checked={groupBooking.status === 'in_progress' || groupBooking.status === 'confirmed' || groupBooking.status === 'completed'}
                                                        onCheckedChange={(checked) => {
                                                          const newStatus = checked ? 'in_progress' : 'new';
                                                          markAppliedMutation.mutate({ bookingId: groupBooking.id, status: newStatus });
                                                        }}
                                                        disabled={markAppliedMutation.isPending}
                                                        className="data-[state=checked]:bg-green-600 scale-75"
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                          /* Desktop Design: Full Layout */
                                          <>
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
                                                {/* Unified Workflow Stage Display */}
                                                <WorkflowStageMeter booking={groupBooking} />
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
                                                      {/* Always prefer venue name, fall back to address if no venue */}
                                                      {groupBooking.venue || groupBooking.venueAddress}
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
                                                  {/* Invoice Status Icon */}
                                                  {getInvoiceStatusIcon(groupBooking.id)}
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
                                                  🎵 {groupBooking.status === 'new' ? 'Apply on Encore' : 'Applied on Encore'}
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
                                                  navigate(`/conversation/${groupBooking.id}`);
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
                                          </>
                                          )}
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
                          className={`relative hover:shadow-lg transition-all duration-300 border-l-4 shadow-sm rounded-lg border border-gray-100 ${getStatusBorderColor(booking.status, booking.bandId, settings?.showBandColors)} ${
                            selectedBookings.includes(booking.id) ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                          style={settings?.showBandColors && booking.bandId ? getBandBorderStyle(booking.bandId) : {}}
                        >
                          <CardContent className={`${isDesktop ? 'p-6' : 'p-4'}`}>
                            {/* Mobile Design: Square Card with Dense Information */}
                            {!isDesktop ? (
                              <div className="space-y-3">
                                {/* Header Row - Date and Status */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 rounded-lg px-3 py-2 text-center min-w-[60px]">
                                      <div className="text-xl font-bold text-primary">
                                        {format(new Date(booking.eventDate), 'd')}
                                      </div>
                                      <div className="text-xs text-muted-foreground uppercase font-medium">
                                        {format(new Date(booking.eventDate), 'MMM')}
                                      </div>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className={`inline-block w-2 h-2 rounded-full ${
                                          booking.status === 'new' ? 'bg-blue-500' :
                                          booking.status === 'confirmed' ? 'bg-green-500' :
                                          booking.status === 'in_progress' ? 'bg-orange-500' :
                                          booking.status === 'completed' ? 'bg-gray-500' :
                                          'bg-gray-400'
                                        }`} />
                                        <span className="text-xs uppercase font-medium text-muted-foreground tracking-wide">
                                          {booking.status.replace('_', ' ')}
                                        </span>
                                        {booking.applyNowLink && (
                                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300 px-1 py-0">
                                            🎵
                                          </Badge>
                                        )}
                                      </div>
                                      <h3 className="font-semibold text-base line-clamp-1 text-foreground">
                                        {booking.venue || booking.clientName || booking.eventType || 'Event'}
                                      </h3>
                                    </div>
                                  </div>
                                  
                                  {/* Action Menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem asChild>
                                        <Link href={`/bookings?id=${booking.id}`}>
                                          <Eye className="mr-2 h-4 w-4" />
                                          View/Edit
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/conversation/${booking.id}`);
                                        }}
                                      >
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        Conversation
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                
                                {/* Information Grid */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="space-y-1">
                                    {booking.clientName && booking.venue && (
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                        <span className="text-muted-foreground truncate text-xs">{booking.clientName}</span>
                                      </div>
                                    )}
                                    {booking.eventTime && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                        <span className="text-xs font-medium">{booking.eventTime}</span>
                                      </div>
                                    )}
                                    {booking.venue && booking.venueAddress && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                        <span className="text-xs text-muted-foreground truncate">{booking.venueAddress.split(',')[0]}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-1 text-right">
                                    {booking.fee && (
                                      <div className="flex items-center justify-end gap-1">
                                        <PoundSterling className="w-3 h-3 text-green-600 flex-shrink-0" />
                                        <span className="text-xs font-semibold text-green-600">
                                          {(() => {
                                            const amountDisplay = getBookingAmountDisplayText(booking, settings);
                                            return amountDisplay.main;
                                          })()}
                                        </span>
                                      </div>
                                    )}
                                    {booking.createdAt && (
                                      <div className="text-xs text-muted-foreground">
                                        {formatReceivedTime(booking.createdAt)}
                                      </div>
                                    )}
                                    {getInvoiceStatusIcon(booking.id) && (
                                      <div className="flex justify-end">
                                        {getInvoiceStatusIcon(booking.id)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Encore Apply Button - if present */}
                                {booking.applyNowLink && (
                                  <div className="pt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(booking.applyNowLink, '_blank');
                                        }}
                                        className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 text-xs px-2 py-1 h-7"
                                      >
                                        🎵 {booking.status === 'new' ? 'Apply on Encore' : 'Applied'}
                                      </Button>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600">Applied:</span>
                                        <Switch
                                          checked={booking.status === 'in_progress' || booking.status === 'confirmed' || booking.status === 'completed'}
                                          onCheckedChange={(checked) => {
                                            const newStatus = checked ? 'in_progress' : 'new';
                                            markAppliedMutation.mutate({ bookingId: booking.id, status: newStatus });
                                          }}
                                          disabled={markAppliedMutation.isPending}
                                          className="data-[state=checked]:bg-green-600 scale-75"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                            /* Desktop Design: Full Layout */
                            <>
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
                                  {/* Unified Workflow Stage Display */}
                                  <WorkflowStageMeter booking={booking} />
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
                                        {/* Always prefer venue name, fall back to address if no venue */}
                                        {booking.venue || booking.venueAddress}
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
                                        {(() => {
                                          const amountDisplay = getBookingAmountDisplayText(booking, settings);
                                          return amountDisplay.main;
                                        })()}
                                      </span>
                                    )}
                                    {/* Invoice Status Icon */}
                                    {getInvoiceStatusIcon(booking.id)}
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
                                  🎵 {booking.status === 'new' ? 'Apply on Encore' : 'Applied on Encore'}
                                </Button>
                              )}
                              
                              {/* Primary Actions - Clean Hybrid Approach */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/conversation/${booking.id}`);
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
                          </>
                          )}
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
                        <h2 className="text-xl font-semibold min-w-[200px]" style={{color: theme.mode === 'dark' ? '#e5e5e5' : '#1a1a1a'}}>
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
                      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Upload className="w-4 h-4 mr-2" />
                            Import Calendar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Import Calendar</DialogTitle>
                          </DialogHeader>
                          <SimpleCalendarImport
                            onImportComplete={(result) => {
                              console.log('📅 Calendar import completed:', result);
                            }}
                            onClose={() => setImportModalOpen(false)}
                          />
                        </DialogContent>
                      </Dialog>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateICSFile}
                        data-testid="button-export-calendar"
                      >
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
                      <div className={`grid grid-cols-7 gap-1 h-full ${!isDesktop ? 'calendar-grid-landscape' : ''}`}>
                        {/* Week Day Headers */}
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={day} className={`p-2 text-center text-sm font-medium h-10 flex items-center justify-center ${!isDesktop ? 'calendar-header-landscape' : ''}`} style={{color: theme.mode === 'dark' ? '#e5e5e5' : '#1a1a1a'}}>
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
                              ${day.isToday ? 'bg-blue-50 border-blue-200 today' : ''}
                              ${!isDesktop ? 'calendar-day-cell-landscape' : ''}
                            `}
                            style={{ height: 'calc(100% - 40px)' }}
                            onClick={() => handleDateClick(day.date)}
                          >
                            <div className={`font-medium text-sm mb-2 ${!isDesktop ? 'date-number' : ''}`}>
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
                                        } ${!isDesktop ? 'event-item' : ''}`}
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
                                                <div className="flex items-center gap-3">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      window.open(booking.applyNowLink, '_blank');
                                                    }}
                                                    className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                                                  >
                                                    {booking.status === 'new' ? 'Apply on Encore' : 'Applied on Encore'}
                                                  </Button>
                                                  <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-gray-600">Applied:</span>
                                                    <Switch
                                                      checked={booking.status === 'in_progress' || booking.status === 'confirmed' || booking.status === 'completed'}
                                                      onCheckedChange={(checked) => {
                                                        const newStatus = checked ? 'in_progress' : 'new';
                                                        markAppliedMutation.mutate({ bookingId: booking.id, status: newStatus });
                                                      }}
                                                      disabled={markAppliedMutation.isPending}
                                                      className="data-[state=checked]:bg-green-600 scale-75"
                                                    />
                                                  </div>
                                                </div>
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
                                <div className="text-xs text-muted-foreground">
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
                      <div className={`grid grid-cols-7 gap-1 flex-shrink-0 ${!isDesktop ? 'calendar-tabs-landscape' : ''}`}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                          <div key={day} className={`p-2 text-center text-sm font-medium h-10 flex items-center justify-center ${!isDesktop ? 'calendar-header-landscape' : ''}`} style={{color: theme.mode === 'dark' ? '#e5e5e5' : '#1a1a1a'}}>
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Month Calendar Days - Fixed Grid Height */}
                      <div className={`grid grid-cols-7 gap-1 flex-1 ${!isDesktop ? 'calendar-grid-landscape' : ''}`} style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
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
                                ${day.isToday ? 'bg-blue-50 border-blue-200 today' : ''}
                                ${day.day === '' ? 'invisible' : ''}
                                ${!isDesktop ? 'calendar-day-cell-landscape' : ''}
                              `}
                              onClick={() => day.day !== '' && handleDateClick(day.date)}
                            >
                              <div className={`font-medium text-sm mb-1 flex-shrink-0 ${!isDesktop ? 'date-number' : ''}`}>
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
                                          } ${!isDesktop ? 'event-item' : ''}`}
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
                                                  <div className="flex items-center gap-3">
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        window.open(booking.applyNowLink, '_blank');
                                                      }}
                                                      className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                                                    >
                                                      {booking.status === 'new' ? 'Apply on Encore' : 'Applied on Encore'}
                                                    </Button>
                                                    <div className="flex items-center gap-2 text-sm">
                                                      <span className="text-gray-600">Applied:</span>
                                                      <Switch
                                                        checked={booking.status === 'in_progress' || booking.status === 'confirmed' || booking.status === 'completed'}
                                                        onCheckedChange={(checked) => {
                                                          const newStatus = checked ? 'in_progress' : 'new';
                                                          markAppliedMutation.mutate({ bookingId: booking.id, status: newStatus });
                                                        }}
                                                        disabled={markAppliedMutation.isPending}
                                                        className="data-[state=checked]:bg-green-600 scale-75"
                                                      />
                                                    </div>
                                                  </div>
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
                                  <div className="text-xs text-muted-foreground">
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
                              <div className="text-xs text-muted-foreground">
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
                                    <div className="text-xs text-muted-foreground">
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
          className={`${isDesktop ? 'max-w-none max-h-[95vh]' : 'max-w-full max-h-[90vh] mx-2'} overflow-x-auto overflow-y-hidden flex flex-col p-0 luminance-aware w-full`}
          style={{ 
            width: isDesktop ? '95vw' : 'calc(100vw - 16px)', 
            height: isDesktop ? '95vh' : '85vh',
            margin: '0 auto'
          }}
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

          
          <div className={`flex-1 overflow-y-auto ${isDesktop ? 'p-4 pb-20' : 'p-2 pb-16'} relative w-full`}>
            {/* Keyboard instructions - Only show on desktop */}
            {isDesktop && (
              <div className="absolute top-4 left-8 z-10">
                <div className="text-xs font-medium" style={{
                  color: getOptimalTextColor(settings?.themeAccentColor || theme.colors.primary),
                  textShadow: getOptimalTextColor(settings?.themeAccentColor || theme.colors.primary) === '#ffffff' 
                    ? '0 1px 3px rgba(0,0,0,0.4)' 
                    : '0 1px 2px rgba(255,255,255,0.3)'
                }}>
                  ← → months • ↑ ↓ years • Enter/Space today • Esc close
                </div>
              </div>
            )}

            
            {/* Full-Screen Calendar Grid - Hidden in mobile portrait, optimized for mobile landscape */}
            <div className={`h-full flex flex-col w-full max-w-none mx-auto ${!isDesktop ? 'mobile-calendar-container' : ''}`}>
              {/* Month Header - Bold Theme Background */}
              <div className="flex items-center justify-center mb-6 flex-col relative">
                <div className="absolute inset-0 rounded-xl shadow-xl" style={{
                  backgroundColor: settings?.themeAccentColor || theme.colors.primary,
                  background: `linear-gradient(135deg, ${settings?.themeAccentColor || theme.colors.primary}ee, ${settings?.themeAccentColor || theme.colors.primary})`,
                  boxShadow: `0 8px 32px ${settings?.themeAccentColor || theme.colors.primary}40`
                }}></div>
                <div className="relative z-10 py-6 px-8">
                  <h2 className="text-5xl font-bold mb-4 text-center drop-shadow-lg" style={{
                    color: getOptimalTextColor(settings?.themeAccentColor || theme.colors.primary)
                  }}>
                    {monthNames[fullScreenCurrentDate.getMonth()]} {fullScreenCurrentDate.getFullYear()}
                  </h2>
                </div>
              </div>
              
              {/* Day Headers - Full Theme Color Backgrounds with Luminance Aware Text */}
              <div className={`grid grid-cols-7 gap-2 mb-3 w-full ${!isDesktop ? 'calendar-grid-landscape' : ''}`}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                  const bgColor = settings?.themeAccentColor || theme.colors.primary;
                  const textColor = getOptimalTextColor(bgColor);
                  return (
                    <div key={day} className={`text-center font-bold py-4 text-sm rounded-lg shadow-md ${!isDesktop ? 'calendar-header-landscape' : ''}`} style={{
                      backgroundColor: bgColor,
                      background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)`,
                      color: textColor,
                      textShadow: textColor === '#ffffff' ? '0 1px 3px rgba(0,0,0,0.4)' : '0 1px 2px rgba(255,255,255,0.3)',
                      boxShadow: `0 4px 12px ${bgColor}30`
                    }}>
                      {day}
                    </div>
                  );
                })}
              </div>
              
              {/* Calendar Grid - 6 Weeks (42 days) with Equal Row Heights */}
              <div className={`grid grid-cols-7 grid-rows-6 ${isDesktop ? 'gap-2' : 'gap-1'} flex-1 min-h-0 w-full ${!isDesktop ? 'calendar-grid-landscape' : ''}`}>
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
                        ${isDesktop ? 'p-3' : 'p-1.5'} cursor-pointer flex flex-col h-full rounded-xl transition-all duration-300 transform hover:scale-[1.02]
                        ${day.isCurrentMonth ? 'shadow-lg hover:shadow-xl' : 'opacity-70 hover:opacity-90'}
                        ${day.isToday ? 'shadow-2xl ring-4 ring-opacity-50' : ''}
                        ${isSelectedDate ? 'ring-4 ring-opacity-60 scale-[1.02]' : ''}
                        ${!isDesktop ? 'calendar-day-cell-landscape' : ''}
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
                            // On mobile: navigate to list view and highlight booking
                            // On desktop: navigate to edit page
                            if (!isDesktop) {
                              setViewMode('list');
                              localStorage.setItem('bookingViewMode', 'list');
                              setHighlightBookingId(booking.id);
                              // Scroll to the booking after a short delay
                              setTimeout(() => {
                                const element = document.getElementById(`booking-${booking.id}`);
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }
                              }, 300);
                            } else {
                              navigateToEditBooking(booking);
                            }
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
                                  ? getStatusColor(event.status || 'new', booking?.bandId, settings?.showBandColors)
                                  : 'bg-gray-300 text-gray-600'
                              } ${
                                highlightedBookingId === event.id.toString() ? 'ring-2 ring-yellow-400 ring-offset-1 shadow-lg' : ''
                              }`}
                              style={day.isCurrentMonth ? getCalendarEventStyle(booking?.bandId, settings?.showBandColors) : {}}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (booking) {
                                  setFullScreenCalendarOpen(false);
                                  // On mobile: navigate to list view and highlight booking
                                  // On desktop: navigate to edit page
                                  if (!isDesktop) {
                                    setViewMode('list');
                                    localStorage.setItem('bookingViewMode', 'list');
                                    setHighlightBookingId(booking.id);
                                    // Scroll to the booking after a short delay
                                    setTimeout(() => {
                                      const element = document.getElementById(`booking-${booking.id}`);
                                      if (element) {
                                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }
                                    }, 300);
                                  } else {
                                    navigateToEditBooking(booking);
                                  }
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

      {/* Portal-based Hover Card - Only show on desktop */}
      {hoveredBooking && hoverCardVisible && isDesktop && createPortal(
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
                          console.log('Navigating to conversation for respond:', booking.id);
                          navigate(`/conversation/${booking.id}`);
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
                          console.log('Navigating to conversation for thankyou:', booking.id);
                          navigate(`/conversation/${booking.id}?action=thankyou`);
                        }, 200);
                        break;
                      case 'send_compliance':
                        setSelectedBookingForCompliance(booking);
                        setComplianceDialogOpen(true);
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
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(hoveredBooking.applyNowLink, '_blank');
                      }}
                      className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                    >
                      {hoveredBooking.status === 'new' ? 'Apply on Encore' : 'Applied on Encore'}
                    </Button>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">Applied:</span>
                      <Switch
                        checked={hoveredBooking.status === 'in_progress' || hoveredBooking.status === 'confirmed' || hoveredBooking.status === 'completed'}
                        onCheckedChange={(checked) => {
                          const newStatus = checked ? 'in_progress' : 'new';
                          markAppliedMutation.mutate({ bookingId: hoveredBooking.id, status: newStatus });
                        }}
                        disabled={markAppliedMutation.isPending}
                        className="data-[state=checked]:bg-green-600 scale-75"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Band Context Menu */}
      <BandContextMenu
        bookingId={bandContextMenu.bookingId!}
        currentBandId={bandContextMenu.currentBandId}
        position={bandContextMenu.position}
        isVisible={bandContextMenu.isVisible}
        onClose={closeBandContextMenu}
      />

    </div>
  );
}