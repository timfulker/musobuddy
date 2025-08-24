import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, MapPin, User, AlertTriangle, Edit, Trash2, CheckCircle, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflictingBookings: any[];
  onEditBooking?: (booking: any) => void;
  onResolveConflict?: (bookingToKeep: any) => void;
}

export default function ConflictResolutionDialog({
  isOpen,
  onClose,
  conflictingBookings = [],
  onEditBooking,
  onResolveConflict
}: ConflictResolutionDialogProps) {
  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [conflictSeverity, setConflictSeverity] = useState<'hard' | 'soft'>('soft');
  const [conflictDate, setConflictDate] = useState<string>('');
  const [editingBookingId, setEditingBookingId] = useState<number | null>(null);
  const [editedTimes, setEditedTimes] = useState<{[key: number]: {eventTime: string, eventEndTime: string}}>({});


  // Get conflict resolutions to check if this conflict group is already resolved
  const { data: resolutions = [] } = useQuery({
    queryKey: ['/api/conflicts/resolutions'],
    enabled: isOpen && conflictingBookings.length > 0,
  });

  // Check if the current conflict group is already resolved
  const isResolved = resolutions?.some((resolution: any) => {
    if (!resolution?.bookingIds) return false;
    
    try {
      // Handle both string and array formats for bookingIds
      let resolutionBookingIds;
      if (typeof resolution.bookingIds === 'string') {
        resolutionBookingIds = JSON.parse(resolution.bookingIds);
      } else if (Array.isArray(resolution.bookingIds)) {
        resolutionBookingIds = resolution.bookingIds;
      } else {
        return false;
      }
      
      const currentBookingIds = conflictingBookings.map((b: any) => b.id).sort((a: number, b: number) => a - b);
      return JSON.stringify(resolutionBookingIds.sort((a: number, b: number) => a - b)) === JSON.stringify(currentBookingIds);
    } catch (error) {
      console.warn('Error parsing resolution bookingIds:', error);
      return false;
    }
  });

  // Determine conflict severity based on time overlaps
  useEffect(() => {
    if (conflictingBookings.length >= 2) {
      let hasTimeOverlap = false;
      let date = '';
      
      // Check each pair for time overlaps
      for (let i = 0; i < conflictingBookings.length; i++) {
        for (let j = i + 1; j < conflictingBookings.length; j++) {
          const booking1 = conflictingBookings[i];
          const booking2 = conflictingBookings[j];
          
          // Set conflict date from first booking
          if (!date && booking1.eventDate) {
            date = new Date(booking1.eventDate).toISOString().split('T')[0];
          }
          
          // Check if both bookings have start times (end times are optional)
          if (booking1.eventTime && booking2.eventTime) {
            // Parse start times
            const [start1Hours, start1Minutes] = booking1.eventTime.split(':').map(Number);
            const [start2Hours, start2Minutes] = booking2.eventTime.split(':').map(Number);
            
            const start1 = start1Hours * 60 + start1Minutes;
            const start2 = start2Hours * 60 + start2Minutes;
            
            // CRITICAL: If either booking lacks end time, treat as hard conflict
            // No assumptions about duration - both start and end times required
            if (!booking1.eventEndTime || !booking2.eventEndTime) {
              hasTimeOverlap = true; // Treat as hard conflict
              break;
            }
            
            const [end1Hours, end1Minutes] = booking1.eventEndTime.split(':').map(Number);
            const [end2Hours, end2Minutes] = booking2.eventEndTime.split(':').map(Number);
            
            const end1 = end1Hours * 60 + end1Minutes;
            const end2 = end2Hours * 60 + end2Minutes;
            
            // Check for actual time overlap
            if (start1 < end2 && end1 > start2) {
              hasTimeOverlap = true;
              break;
            }
          } else if (!booking1.eventTime || !booking2.eventTime) {
            // Only treat as hard conflict if NO start times at all
            hasTimeOverlap = true;
            break;
          }
        }
        if (hasTimeOverlap) break;
      }
      
      setConflictSeverity(hasTimeOverlap ? 'hard' : 'soft');
      setConflictDate(date);
    }
  }, [conflictingBookings]);

  const deleteMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Booking Rejected",
        description: "Booking has been successfully removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject booking",
        variant: "destructive",
      });
    },
  });

  const handleResolve = () => {
    if (selectedBooking && onResolveConflict) {
      onResolveConflict(selectedBooking);
      toast({
        title: "Conflict Resolved",
        description: `Kept booking for ${selectedBooking.clientName}`,
      });
    }
    onClose();
  };

  const handleEditBooking = (booking: any) => {
    if (onEditBooking) {
      onEditBooking(booking);
      onClose(); // Close conflict dialog when opening edit
    }
  };

  // Start inline editing for a booking
  const startInlineEdit = (booking: any) => {
    setEditingBookingId(booking.id);
    setEditedTimes({
      ...editedTimes,
      [booking.id]: {
        eventTime: booking.eventTime || '',
        eventEndTime: booking.eventEndTime || ''
      }
    });
  };

  // Cancel inline editing
  const cancelInlineEdit = () => {
    setEditingBookingId(null);
  };

  // Save inline edit changes
  const saveInlineEditMutation = useMutation({
    mutationFn: async ({ bookingId, times }: { bookingId: number, times: { eventTime: string, eventEndTime: string }}) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        body: {
          eventTime: times.eventTime,
          eventEndTime: times.eventEndTime
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Times Updated",
        description: "Booking times have been successfully updated",
      });
      setEditingBookingId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking times",
        variant: "destructive",
      });
    },
  });

  const saveInlineEdit = (bookingId: number) => {
    const times = editedTimes[bookingId];
    if (times) {
      saveInlineEditMutation.mutate({ bookingId, times });
    }
  };

  const handleRejectBooking = (booking: any) => {
    deleteMutation.mutate(booking.id);
  };

  // Mutation for resolving soft conflicts
  const resolveMutation = useMutation({
    mutationFn: async (data: { bookingIds: number[]; conflictDate: string; notes?: string }) => {
      return apiRequest('/api/conflicts/resolve', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts/resolutions'] });
      toast({
        title: "Conflict Resolved",
        description: "Soft conflict has been marked as resolved",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve conflict",
        variant: "destructive",
      });
    },
  });

  const handleResolveConflict = () => {
    if (conflictSeverity === 'soft' && conflictingBookings.length >= 2) {
      const bookingIds = conflictingBookings.map(b => b.id);
      resolveMutation.mutate({
        bookingIds,
        conflictDate,
        notes: 'Soft conflict resolved by user'
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('🟡 Dialog onOpenChange called:', { open, isOpen });
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Resolve Booking Conflicts
          </DialogTitle>
          <DialogDescription>
            {conflictSeverity === 'hard' ? (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                Hard conflict detected - bookings have overlapping times or missing time information. Edit or reject bookings to resolve.
              </div>
            ) : isResolved ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                This conflict has been resolved. Individual booking conflicts remain visible for reference.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                Soft conflict - bookings are on the same day but different times. You can resolve this conflict if acceptable.
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {conflictingBookings.map((booking) => (
            <div
              key={booking.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedBooking?.id === booking.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedBooking(booking)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{booking.clientName || 'Unknown Client'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{formatDate(booking.eventDate)}</span>
                    </div>
                    {booking.status && (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        booking.status === 'new' ? 'bg-blue-100 text-blue-800' :
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      {editingBookingId === booking.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={editedTimes[booking.id]?.eventTime || ''}
                            onChange={(e) => setEditedTimes({
                              ...editedTimes,
                              [booking.id]: {
                                ...editedTimes[booking.id],
                                eventTime: e.target.value
                              }
                            })}
                            className="h-7 w-24 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-sm">-</span>
                          <Input
                            type="time"
                            value={editedTimes[booking.id]?.eventEndTime || ''}
                            onChange={(e) => setEditedTimes({
                              ...editedTimes,
                              [booking.id]: {
                                ...editedTimes[booking.id],
                                eventEndTime: e.target.value
                              }
                            })}
                            className="h-7 w-24 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <span className="text-sm">
                          {booking.eventTime || 'TBC'} - {booking.eventEndTime || 'TBC'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {booking.venue || 'Venue TBC'}
                        {booking.venueAddress && ` - ${booking.venueAddress}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Event:</span> {booking.eventType} | 
                    <span className="font-medium ml-2">Fee:</span> £{booking.agreedFee || 'TBC'}
                  </div>
                </div>

                <div className="ml-4 flex flex-col gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'contract_sent' ? 'bg-orange-100 text-orange-800' :
                    booking.status === 'client_confirms' ? 'bg-orange-100 text-orange-800' :
                    booking.status === 'awaiting_response' ? 'bg-blue-100 text-blue-800' :
                    booking.status === 'new' ? 'bg-sky-100 text-sky-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {booking.status?.replace('_', ' ').toUpperCase()}
                  </div>
                  
                  <div className="flex gap-1">
                    {editingBookingId === booking.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveInlineEdit(booking.id);
                          }}
                          className="h-8 px-2 text-green-600 hover:text-green-700"
                          disabled={saveInlineEditMutation.isPending}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelInlineEdit();
                          }}
                          className="h-8 px-2"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            startInlineEdit(booking);
                          }}
                          className="h-8 px-2"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit Time
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditBooking(booking);
                          }}
                          className="h-8 px-2"
                        >
                          Full Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectBooking(booking);
                          }}
                          className="h-8 px-2 text-red-600 hover:text-red-700"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {/* Show different buttons based on conflict type and resolution status */}
          {conflictSeverity === 'soft' && !isResolved && (
            <Button 
              onClick={handleResolveConflict}
              disabled={resolveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {resolveMutation.isPending ? 'Resolving...' : 'Mark as Resolved'}
            </Button>
          )}
          
          {conflictSeverity === 'hard' && (
            <Button 
              onClick={handleResolve}
              disabled={!selectedBooking}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Keep Selected Booking
            </Button>
          )}
          
          {isResolved && (
            <Button 
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200"
              disabled
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Resolved
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}