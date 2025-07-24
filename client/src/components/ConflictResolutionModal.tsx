import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Clock, MapPin, User, AlertTriangle } from "lucide-react";

interface Conflict {
  withBookingId: number;
  severity: 'hard' | 'soft' | 'resolved';
  clientName: string;
  status: string;
  time: string;
  canEdit: boolean;
  canReject: boolean;
  type: string;
  message: string;
  overlapMinutes?: number;
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBooking: any;
  conflicts: Conflict[];
}

export default function ConflictResolutionModal({ 
  isOpen, 
  onClose, 
  currentBooking: passedCurrentBooking, 
  conflicts 
}: ConflictResolutionModalProps) {
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    eventTime: '',
    eventEndTime: ''
  });
  const { toast } = useToast();

  // Fetch conflicting booking details
  // Handle two different conflict data structures:
  // 1. From bookings page: array of booking objects (conflicts are the bookings themselves)
  // 2. From API: array with withBookingId properties
  const conflictingBookingIds = conflicts
    .map(c => c.withBookingId || (c as any).id) // Try withBookingId first, then id as fallback
    .filter(id => id && !isNaN(Number(id)))
    .map(id => Number(id));
  
  console.log('🔍 Conflict Resolution Modal - Booking IDs:', conflictingBookingIds);
  console.log('🔍 Conflict Resolution Modal - Passed Current Booking:', passedCurrentBooking);
  
  // Use the passed currentBooking instead of fetching it again
  const currentBooking = passedCurrentBooking;
  console.log('🔍 Conflict Resolution Modal - isOpen:', isOpen);
  console.log('🔍 Conflict Resolution Modal - Conflicting Booking Query Enabled:', conflictingBookingIds.length > 0);
  console.log('🔍 Conflict Resolution Modal - Query Key:', ['/api/bookings/batch', conflictingBookingIds]);
  
  const { data: conflictingBookings = [] } = useQuery({
    queryKey: ['/api/bookings/conflicting', ...conflictingBookingIds],
    queryFn: async () => {
      if (conflictingBookingIds.length === 0) return [];
      console.log('🔍 Starting to fetch conflicting bookings for IDs:', conflictingBookingIds);
      
      // Fetch each booking individually since we don't have a batch endpoint
      const bookingsPromises = conflictingBookingIds.map(async (id) => {
        console.log(`🔍 Fetching booking ID: ${id}`);
        try {
          const response = await fetch(`/api/bookings/${id}`, {
            credentials: 'include'
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const result = await response.json();
          console.log(`✅ Successfully fetched booking ${id}:`, result?.clientName || 'No client name');
          return result;
        } catch (error) {
          console.error(`❌ Failed to fetch booking ${id}:`, error);
          return null;
        }
      });
      const results = await Promise.all(bookingsPromises);
      const validResults = results.filter(result => result !== null);
      console.log('🔍 Final valid conflicting bookings count:', validResults.length);
      console.log('🔍 Final valid conflicting bookings:', validResults);
      return validResults;
    },
    enabled: conflictingBookingIds.length > 0 && isOpen, // Always enabled when we have booking IDs
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, data }: { bookingId: number; data: any }) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking updated",
        description: "The booking time has been updated successfully.",
      });
      setEditingBookingId(null);
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Reject booking mutation
  const rejectBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking rejected",
        description: "The booking has been rejected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject booking. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleEditTime = (bookingId: number, currentTime: string, currentEndTime: string) => {
    setEditingBookingId(bookingId);
    setEditFormData({
      eventTime: currentTime || '',
      eventEndTime: currentEndTime || ''
    });
  };

  const handleSaveTimeEdit = () => {
    if (!editingBookingId) return;
    
    updateBookingMutation.mutate({
      bookingId: editingBookingId,
      data: editFormData
    });
  };

  const handleRejectBooking = (bookingId: number, bookingStatus: string) => {
    if (bookingStatus === 'confirmed') {
      toast({
        title: "Cannot reject confirmed booking",
        description: "Confirmed bookings must be edited or deleted from the full booking form.",
        variant: "destructive"
      });
      return;
    }

    if (window.confirm('Are you sure you want to reject this booking? This cannot be undone.')) {
      rejectBookingMutation.mutate(bookingId);
    }
  };

  const handleViewBooking = (bookingId: number) => {
    // Close modal and navigate to booking
    onClose();
    window.open(`/bookings?id=${bookingId}`, '_blank');
  };

  const handleSaveAndRecheck = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
    toast({
      title: "Conflicts rechecked",
      description: "The system has rechecked for conflicts.",
    });
  };

  const renderBookingCard = (booking: any, isCurrentBooking = false, conflict?: Conflict) => {
    const isEditing = editingBookingId === booking.id;
    // Both bookings should show reject button if not confirmed/completed
    const canReject = booking.status !== 'confirmed' && booking.status !== 'completed';
    const isConfirmed = booking.status === 'confirmed';

    return (
      <Card key={booking.id} className={`${isCurrentBooking ? 'border-blue-500 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isCurrentBooking ? (
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            ) : (
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            )}
            {isCurrentBooking ? 'Current Booking' : 'Conflicting Booking'}
            {conflict && (
              <Badge variant={conflict.severity === 'hard' ? 'destructive' : 'default'} className="text-xs">
                {conflict.severity === 'hard' ? 'CRITICAL' : 'WARNING'}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{booking.clientName || 'Unknown Client'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {(booking.status && typeof booking.status === 'string') ? booking.status.replace('_', ' ').toUpperCase() : 'NEW'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : 'No date'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{booking.venue || 'No venue'}</span>
            </div>
          </div>

          {/* Time editing section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Time:</span>
            </div>
            {isEditing ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor={`start-${booking.id}`} className="text-xs">Start Time</Label>
                  <Input
                    id={`start-${booking.id}`}
                    type="time"
                    value={editFormData.eventTime}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, eventTime: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor={`end-${booking.id}`} className="text-xs">End Time</Label>
                  <Input
                    id={`end-${booking.id}`}
                    type="time"
                    value={editFormData.eventEndTime}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, eventEndTime: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="text-sm bg-white p-2 rounded border">
                {booking.eventTime && booking.eventEndTime ? 
                  `${booking.eventTime?.replace(/(\d{2}):(\d{2})0+$/, '$1:$2')} - ${booking.eventEndTime?.replace(/(\d{2}):(\d{2})0+$/, '$1:$2')}` : 
                  'No time specified'
                }
                {conflict?.overlapMinutes && (
                  <div className="text-red-600 text-xs mt-1">
                    Overlap: {conflict.overlapMinutes} minutes
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSaveTimeEdit} disabled={updateBookingMutation.isPending}>
                  {updateBookingMutation.isPending ? 'Saving...' : 'Save Time'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingBookingId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleEditTime(booking.id, booking.eventTime || '', booking.eventEndTime || '')}
                >
                  Edit Time
                </Button>
                {canReject && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleRejectBooking(booking.id, booking.status)}
                    disabled={rejectBookingMutation.isPending}
                    title={isConfirmed ? 'Confirmed bookings must be edited or deleted from the full booking form.' : ''}
                  >
                    {rejectBookingMutation.isPending ? 'Rejecting...' : 'Reject Booking'}
                  </Button>
                )}
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewBooking(booking.id)}
                >
                  View Booking
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Don't show "No Conflicts Found" if we're still loading data
  if (!currentBooking || conflicts.length === 0) {
    if (!isOpen) return null; // Don't render anything if modal is closed
    
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {conflictingBookingIds.length > 0 ? "Loading Conflicts..." : "No Conflicts Found"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            {conflictingBookingIds.length > 0 ? (
              <div>
                <p className="text-muted-foreground">Loading conflict details...</p>
                <div className="mt-4 text-sm text-muted-foreground">
                  Fetching {conflictingBookingIds.length} conflicting booking{conflictingBookingIds.length > 1 ? 's' : ''}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">This booking has no conflicts.</p>
            )}
            <Button onClick={onClose} className="mt-4">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Booking Conflict Resolution
            <Badge variant="destructive" className="text-xs">
              {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Side-by-side booking comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Current booking */}
            {currentBooking && renderBookingCard(currentBooking, true)}

            {/* Conflicting bookings */}
            {conflictingBookings.length > 0 ? (
              conflictingBookings.map((conflictingBooking: any, index: number) => {
                const conflict = conflicts.find(c => c.withBookingId === conflictingBooking.id);
                return (
                  <div key={conflictingBooking.id || `conflict-${index}`}>
                    {renderBookingCard(conflictingBooking, false, conflict)}
                  </div>
                );
              })
            ) : (
              <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                <p>Loading conflicting booking details...</p>
                <p className="text-sm mt-2">Booking IDs: {conflictingBookingIds.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleSaveAndRecheck}>
              Save & Recheck Conflicts
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}