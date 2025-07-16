import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Calendar, MapPin, Clock, User, Phone, DollarSign, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Sidebar from '@/components/sidebar';
import DashboardHeader from '@/components/dashboard-header';
import MobileNav from '@/components/mobile-nav';
import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import BookingStatusDialog from '@/components/BookingStatusDialog';
import BookingDetailsModal from '@/components/BookingDetailsModal';
import SendComplianceDialog from '@/components/SendComplianceDialog';
import { getConflictColor, getConflictIcon, analyzeConflictSeverity, getConflictBadge, formatConflictTooltip } from '@/utils/conflict-ui';

// API functions
const fetchBookings = async () => {
  const response = await fetch('/api/bookings');
  if (!response.ok) throw new Error('Failed to fetch bookings');
  return response.json();
};

const updateBooking = async ({ id, ...updates }: any) => {
  const response = await fetch(`/api/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update booking');
  return response.json();
};

const deleteBooking = async (id: number) => {
  const response = await fetch(`/api/bookings/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete booking');
  return response.json();
};

const autoCompleteBookings = async () => {
  const response = await fetch('/api/bookings/auto-complete', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to auto-complete bookings');
  return response.json();
};

export default function Bookings() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBookings, setSelectedBookings] = useState<number[]>([]);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const { toast } = useToast();
  const { isDesktop } = useResponsive();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: fetchBookings,
  });

  const updateMutation = useMutation({
    mutationFn: updateBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Booking updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error updating booking', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast({ title: 'Booking deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error deleting booking', description: error.message, variant: 'destructive' });
    },
  });

  const autoCompleteMutation = useMutation({
    mutationFn: autoCompleteBookings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      if (data.updated > 0) {
        toast({ title: `Auto-completed ${data.updated} past bookings` });
      }
    },
  });

  // Auto-complete past bookings on page load
  useEffect(() => {
    autoCompleteMutation.mutate();
  }, []);

  // Filter bookings based on search and status
  const filteredBookings = bookings.filter((booking: any) => {
    const matchesSearch = booking.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.venue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.eventType?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || booking.status === selectedStatus;
    
    // Hide completed bookings unless specifically selected
    const showCompleted = selectedStatus === 'completed' || selectedStatus === 'all';
    if (booking.status === 'completed' && !showCompleted) return false;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (bookingId: number, newStatus: string) => {
    updateMutation.mutate({ id: bookingId, status: newStatus });
  };

  const handleBulkStatusUpdate = (newStatus: string) => {
    selectedBookings.forEach(bookingId => {
      updateMutation.mutate({ id: bookingId, status: newStatus });
    });
    setSelectedBookings([]);
  };

  const handleSelectAll = () => {
    if (selectedBookings.length === filteredBookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(filteredBookings.map((booking: any) => booking.id));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedBookings.length} bookings? This action cannot be undone.`)) {
      selectedBookings.forEach(bookingId => {
        deleteMutation.mutate(bookingId);
      });
      setSelectedBookings([]);
    }
  };

  const StatusButton = ({ status, currentStatus, onClick, children }: any) => {
    const isActive = currentStatus === status;
    const baseClasses = "px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer";
    
    const statusStyles = {
      'new': isActive ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100',
      'booking_in_progress': isActive ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-amber-100',
      'confirmed': isActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-green-100',
      'contract_sent': isActive ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-purple-100',
      'rejected': isActive ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-red-100',
      'cancelled': isActive ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    };

    return (
      <button
        onClick={onClick}
        className={`${baseClasses} ${statusStyles[status as keyof typeof statusStyles]}`}
      >
        {children}
      </button>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Bookings</h1>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600 mt-1">Manage your booking lifecycle from enquiry to confirmed gig</p>
        </div>
        <button 
          onClick={() => window.location.href = '/enquiries'}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Enquiry
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search enquiries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Status:</span>
          <div className="flex gap-1">
            <StatusButton 
              status="all" 
              currentStatus={selectedStatus} 
              onClick={() => setSelectedStatus('all')}
            >
              All
            </StatusButton>
            <StatusButton 
              status="new" 
              currentStatus={selectedStatus} 
              onClick={() => setSelectedStatus('new')}
            >
              Enquiry
            </StatusButton>
            <StatusButton 
              status="booking_in_progress" 
              currentStatus={selectedStatus} 
              onClick={() => setSelectedStatus('booking_in_progress')}
            >
              In Progress
            </StatusButton>
            <StatusButton 
              status="confirmed" 
              currentStatus={selectedStatus} 
              onClick={() => setSelectedStatus('confirmed')}
            >
              Confirmed
            </StatusButton>
            <StatusButton 
              status="contract_sent" 
              currentStatus={selectedStatus} 
              onClick={() => setSelectedStatus('contract_sent')}
            >
              Contract Sent
            </StatusButton>
            <StatusButton 
              status="completed" 
              currentStatus={selectedStatus} 
              onClick={() => setSelectedStatus('completed')}
            >
              Completed
            </StatusButton>
            <StatusButton 
              status="rejected" 
              currentStatus={selectedStatus} 
              onClick={() => setSelectedStatus('rejected')}
            >
              Rejected
            </StatusButton>
          </div>
        </div>
      </div>

      {/* Bulk Operations */}
      {selectedBookings.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-800">
              {selectedBookings.length} booking{selectedBookings.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatusUpdate('new')}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                E
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('booking_in_progress')}
                className="px-3 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600"
              >
                P
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('confirmed')}
                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
              >
                C
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('contract_sent')}
                className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600"
              >
                S
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('rejected')}
                className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
              >
                R
              </button>
            </div>
          </div>
          <button
            onClick={handleBulkDelete}
            className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      )}

      {/* Conflict Indicators */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">Conflict Indicators:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-red-600">CONFIRMED BOOKING</span>
            <span className="text-gray-400">- Double booking risk</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span className="text-amber-600">Warning</span>
            <span className="text-gray-400">- Timeslot conflict</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-600">Same Client</span>
            <span className="text-gray-400">- Multiple events</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-gray-600">Same Day</span>
            <span className="text-gray-400">- Check timing</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-blue-600">No Conflicts</span>
          </div>
        </div>
      </div>

      {/* Select All */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={selectedBookings.length === filteredBookings.length && filteredBookings.length > 0}
          onChange={handleSelectAll}
          className="rounded border-gray-300"
        />
        <span>Select all {filteredBookings.length} filtered bookings</span>
      </div>

      {/* Bookings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBookings.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No bookings found</p>
                <p className="text-gray-400">
                  {searchTerm || selectedStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Get started by creating your first enquiry'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredBookings.map((booking: any) => {
            const dateBox = booking.eventDate 
              ? {
                  day: format(new Date(booking.eventDate), 'dd'),
                  monthYear: format(new Date(booking.eventDate), 'MMM yyyy')
                }
              : { day: '?', monthYear: 'TBC' };
            
            // Enhanced conflict detection
            const conflicts = booking.conflicts || [];
            const confirmedBookingConflicts = conflicts.filter((c: any) => c.type === 'booking');
            const unconfirmedEnquiryConflicts = conflicts.filter((c: any) => c.type === 'enquiry');
            
            const conflictAnalysis = {
              hasTimeOverlap: false,
              sameVenue: false,
              sameClient: false,
              confirmedBooking: confirmedBookingConflicts.length > 0,
              unconfirmedEnquiry: unconfirmedEnquiryConflicts.length > 0,
              conflictCount: conflicts.length,
              conflictDetails: conflicts.length > 0 ? 
                `${confirmedBookingConflicts.length} confirmed booking(s), ${unconfirmedEnquiryConflicts.length} unconfirmed enquiry(ies)` 
                : 'No conflicts'
            };
            
            const severity = analyzeConflictSeverity(booking, conflictAnalysis);
            const hasConflicts = conflicts.length > 0;
            
            // Check if booking date is in the past
            const isPastDate = booking.eventDate && new Date(booking.eventDate) < new Date();
            
            // Status-based styling
            const getStatusOverlay = (status: string) => {
              switch (status) {
                case "new": return "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200";
                case "booking_in_progress": return "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200";
                case "confirmed": return "bg-gradient-to-br from-green-50 to-green-100 border-green-200";
                case "contract_sent": return "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200";
                case "completed": return "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200";
                case "rejected": return "bg-gradient-to-br from-red-50 to-red-100 border-red-200";
                default: return "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200";
              }
            };
            
            const getStatusColor = (status: string) => {
              switch (status) {
                case "new": return "text-blue-800 bg-blue-100";
                case "booking_in_progress": return "text-amber-800 bg-amber-100";
                case "confirmed": return "text-green-800 bg-green-100";
                case "contract_sent": return "text-purple-800 bg-purple-100";
                case "completed": return "text-gray-800 bg-gray-100";
                case "rejected": return "text-red-800 bg-red-100";
                default: return "text-gray-800 bg-gray-100";
              }
            };
            
            // Conflict overlay styling
            const getConflictOverlay = () => {
              if (severity.level === 'critical') {
                return 'border-red-500 bg-red-50 ring-2 ring-red-200';
              } else if (severity.level === 'warning') {
                return 'border-amber-500 bg-amber-50 ring-2 ring-amber-200';
              }
              return '';
            };

            return (
              <div key={booking.id} className="bg-white rounded-lg shadow-sm border relative">
                {/* Double Booking Risk Header */}
                {hasConflicts && (
                  <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-t-lg">
                    DOUBLE BOOKING RISK
                  </div>
                )}
                
                <div className="p-4">
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2">
                    <Checkbox
                      checked={selectedBookings.includes(booking.id)}
                      onCheckedChange={() => {
                        if (selectedBookings.includes(booking.id)) {
                          setSelectedBookings(selectedBookings.filter(id => id !== booking.id));
                        } else {
                          setSelectedBookings([...selectedBookings, booking.id]);
                        }
                      }}
                      className="mt-1"
                    />
                  </div>
                  
                  {/* Delete Button */}
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(booking.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 w-6 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="pl-8 pr-8">
                    {/* Header with Price and Status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-bold text-green-600">
                        {booking.estimatedValue ? `£${booking.estimatedValue}` : "Price TBC"}
                      </div>
                      <Badge className={`text-xs px-2 py-1 ${getStatusColor(booking.status)}`}>
                        {booking.status?.toUpperCase().replace('_', ' ') || 'UNKNOWN'}
                      </Badge>
                    </div>
                    
                    {/* Date Box */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-purple-600 text-white rounded-lg p-2 text-center min-w-[50px]">
                        <div className="text-lg font-bold leading-none">{dateBox.day}</div>
                        <div className="text-xs leading-none mt-1">{dateBox.monthYear}</div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{booking.clientName}</div>
                        <div className="text-sm text-gray-500">{booking.venue || 'Venue TBC'}</div>
                      </div>
                    </div>
                    
                    {/* Conflict Indicator */}
                    {hasConflicts && (
                      <div className="flex items-center gap-1 mb-3">
                        <span className="text-red-500 text-sm">⚠️ {conflictAnalysis.conflictCount}</span>
                      </div>
                    )}
                    
                    {/* Status Buttons */}
                    <div className="flex items-center gap-1 mb-3">
                      <StatusButton 
                        status="new" 
                        currentStatus={booking.status} 
                        onClick={() => handleStatusChange(booking.id, 'new')}
                      >
                        E
                      </StatusButton>
                      <StatusButton 
                        status="booking_in_progress" 
                        currentStatus={booking.status} 
                        onClick={() => handleStatusChange(booking.id, 'booking_in_progress')}
                      >
                        P
                      </StatusButton>
                      <StatusButton 
                        status="confirmed" 
                        currentStatus={booking.status} 
                        onClick={() => handleStatusChange(booking.id, 'confirmed')}
                      >
                        C
                      </StatusButton>
                      <StatusButton 
                        status="contract_sent" 
                        currentStatus={booking.status} 
                        onClick={() => handleStatusChange(booking.id, 'contract_sent')}
                      >
                        S
                      </StatusButton>
                      <StatusButton 
                        status="rejected" 
                        currentStatus={booking.status} 
                        onClick={() => handleStatusChange(booking.id, 'rejected')}
                      >
                        R
                      </StatusButton>
                      <StatusButton 
                        status="cancelled" 
                        currentStatus={booking.status} 
                        onClick={() => handleStatusChange(booking.id, 'cancelled')}
                      >
                        ✗
                      </StatusButton>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center justify-between text-xs">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetailsDialog(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                      >
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowStatusDialog(true);
                        }}
                        className="text-gray-600 hover:text-gray-800 p-0 h-auto"
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteMutation.mutate(booking.id)}
                        className="text-red-600 hover:text-red-800 p-0 h-auto"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dialogs */}
      <BookingStatusDialog
        booking={selectedBooking}
        isOpen={showStatusDialog}
        onClose={() => setShowStatusDialog(false)}
        onUpdateStatus={handleStatusChange}
      />
      
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={showDetailsDialog}
        onClose={() => setShowDetailsDialog(false)}
      />
      
      <SendComplianceDialog
        booking={selectedBooking}
        isOpen={showComplianceDialog}
        onClose={() => setShowComplianceDialog(false)}
      />
    </div>
  );
}