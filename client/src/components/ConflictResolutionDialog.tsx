import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  AlertTriangle, 
  Clock, 
  User, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  Edit3, 
  Trash2,
  Check,
  X,
  ChevronRight,
  Info
} from 'lucide-react';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enquiry: any;
  conflicts: any[];
}

export default function ConflictResolutionDialog({ 
  isOpen, 
  onClose, 
  enquiry, 
  conflicts 
}: ConflictResolutionDialogProps) {
  // Early return BEFORE any hooks are called
  if (!enquiry || !enquiry.id) {
    console.error('ConflictResolutionDialog: Invalid data received', { enquiry, conflicts });
    return null;
  }

  console.log('🔥 ConflictResolutionDialog received:', {
    enquiry: enquiry?.id,
    enquiryTitle: enquiry?.title,
    enquiryClient: enquiry?.clientName,
    enquiryDate: enquiry?.eventDate,
    conflictsReceived: conflicts,
    conflictsLength: conflicts?.length,
    conflictIds: conflicts?.map(c => c?.id),
    conflictTitles: conflicts?.map(c => c?.title),
    isOpen,
    rawConflicts: JSON.stringify(conflicts, null, 2)
  });

  // Additional debugging
  if (conflicts && conflicts.length > 0) {
    console.log('🔥 CONFLICTS EXIST:', conflicts.length, 'conflicts found');
    conflicts.forEach((conflict, index) => {
      console.log(`🔥 Conflict ${index}:`, {
        id: conflict?.id,
        title: conflict?.title,
        clientName: conflict?.clientName,
        eventDate: conflict?.eventDate,
        type: conflict?.type,
        status: conflict?.status
      });
    });
  } else {
    console.log('🔥 NO CONFLICTS FOUND - conflicts array is:', conflicts);
  }

  const [selectedAction, setSelectedAction] = useState<string>('');
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [newTime, setNewTime] = useState<string>('');
  const [newEndTime, setNewEndTime] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');

  // State for time editing - map of booking ID to time values
  const [bookingTimes, setBookingTimes] = useState<Record<string, { start: string; end: string }>>(() => {
    const initialTimes: Record<string, { start: string; end: string }> = {};

    // Initialize with the main enquiry
    if (enquiry) {
      initialTimes[enquiry.id] = { 
        start: enquiry.eventTime || '', 
        end: enquiry.eventEndTime || '' 
      };
    }

    // Add processed conflicts
    if (Array.isArray(conflicts)) {
      conflicts.forEach(conflict => {
        if (conflict && conflict.id) {
          initialTimes[conflict.id] = { 
            start: conflict.eventTime || '', 
            end: conflict.eventEndTime || '' 
          };
        }
      });
    }

    console.log('🔥 Initialized booking times:', initialTimes);
    return initialTimes;
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create all conflicting bookings array (new enquiry + existing conflicts)
  const allConflictingBookings = React.useMemo(() => {
    const allBookings = [enquiry];

    // Add conflicts if they exist and are valid
    if (Array.isArray(conflicts)) {
      conflicts.forEach(conflict => {
        if (conflict && conflict.id && conflict.id !== enquiry.id) {
          allBookings.push(conflict);
        }
      });
    }

    console.log('🔥 All conflicting bookings computed:', {
      totalBookings: allBookings.length,
      bookingIds: allBookings.map(b => b.id),
      bookingDetails: allBookings.map(b => ({
        id: b.id,
        title: b.title,
        clientName: b.clientName,
        eventDate: b.eventDate,
        eventTime: b.eventTime,
        type: b.type || 'enquiry'
      }))
    });

    return allBookings;
  }, [enquiry, conflicts]);

  const updateBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest(`/api/bookings/${data.id}`, {
        method: 'PATCH',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Success",
        description: "Booking updated successfully",
      });
    },
    onError: (error) => {
      console.error('Error updating booking:', error);
      toast({
        title: "Error",
        description: "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/bookings/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings/upcoming'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });
      onClose();
    },
    onError: (error) => {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: "Failed to delete booking. Please try again.",
        variant: "destructive",
      });
    }
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString;
  };

  const handleUpdateTime = async (bookingId: string) => {
    const timeData = bookingTimes[bookingId];
    if (!timeData) return;

    console.log('Updating time for booking:', bookingId, timeData);

    await updateBookingMutation.mutateAsync({
      id: bookingId,
      eventTime: timeData.start,
      eventEndTime: timeData.end
    });
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      await deleteBookingMutation.mutateAsync(bookingId);
    }
  };

  const handleRejectNewEnquiry = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    await updateBookingMutation.mutateAsync({
      id: enquiry.id,
      status: 'rejected',
      notes: rejectReason
    });

    onClose();
  };

  const updateBookingTime = (bookingId: string, field: 'start' | 'end', value: string) => {
    setBookingTimes(prev => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        [field]: value
      }
    }));
  };

  const canEditTime = (booking: any) => {
    return booking.status !== 'completed' && booking.status !== 'rejected';
  };

  const renderBookingCard = (booking: any, isNewEnquiry: boolean) => {
    const timeData = bookingTimes[booking.id] || { start: '', end: '' };
    const bookingType = booking.type || (isNewEnquiry ? 'new_enquiry' : 'existing_booking');

    return (
      <Card key={booking.id} className={`${isNewEnquiry ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge variant={isNewEnquiry ? "default" : "secondary"}>
                {isNewEnquiry ? 'New Enquiry' : (bookingType === 'booking' ? 'Existing Booking' : 'Conflicting Enquiry')}
              </Badge>
              {booking.title || `${booking.clientName} - ${booking.eventType || 'Event'}`}
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {booking.status || 'pending'}
            </Badge>
          </div>
          {/* Add conflict type info */}
          {booking.type && (
            <div className="text-xs text-gray-600 flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>Type: {booking.type}</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>{booking.clientName || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span>{booking.clientPhone || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <span>{booking.clientEmail || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{booking.venue || 'Not specified'}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>
                {booking.eventTime ? `${booking.eventTime}` : 'Time not set'}
                {booking.eventEndTime ? ` - ${booking.eventEndTime}` : ''}
              </span>
            </div>
          </div>

          {selectedAction === 'edit_times' && canEditTime(booking) && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`start-${booking.id}`} className="text-sm font-medium">
                    Start Time
                  </Label>
                  <Input
                    id={`start-${booking.id}`}
                    type="time"
                    value={timeData.start}
                    onChange={(e) => updateBookingTime(booking.id, 'start', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`end-${booking.id}`} className="text-sm font-medium">
                    End Time
                  </Label>
                  <Input
                    id={`end-${booking.id}`}
                    type="time"
                    value={timeData.end}
                    onChange={(e) => updateBookingTime(booking.id, 'end', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button 
                onClick={() => handleUpdateTime(booking.id)}
                disabled={updateBookingMutation.isPending}
                className="w-full"
              >
                {updateBookingMutation.isPending ? 'Updating...' : 'Update Time'}
              </Button>
            </div>
          )}

          {selectedAction === 'delete_booking' && (
            <div className="mt-4 border-t pt-4">
              <Button 
                variant="destructive"
                onClick={() => handleDeleteBooking(booking.id)}
                disabled={deleteBookingMutation.isPending}
                className="w-full"
              >
                {deleteBookingMutation.isPending ? 'Deleting...' : 'Delete Booking'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Resolve Scheduling Conflict
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enhanced Conflict Summary */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">
              {allConflictingBookings.length} booking{allConflictingBookings.length !== 1 ? 's' : ''} on {formatDate(enquiry.eventDate)}
            </h3>
            <p className="text-red-700 text-sm mb-2">
              This booking conflicts with {conflicts.length} other booking{conflicts.length !== 1 ? 's' : ''}. Choose an action below to resolve.
            </p>

            {/* Debug information - remove in production */}
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <p><strong>Debug:</strong> Found {allConflictingBookings.length} total bookings ({conflicts.length} conflicts + 1 main enquiry)</p>
              <p><strong>Conflicts:</strong> {conflicts.map(c => `${c.clientName} (${c.type})`).join(', ')}</p>
            </div>
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <h4 className="font-medium">Choose Resolution Action:</h4>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select an action to resolve the conflict" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edit_times">Edit booking times to avoid overlap</SelectItem>
                <SelectItem value="delete_booking">Delete a conflicting booking</SelectItem>
                <SelectItem value="reject_enquiry">Reject the new enquiry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show booking details based on selected action */}
          {selectedAction === 'edit_times' && (
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Edit Booking Times</h4>
              <p className="text-sm text-gray-600 mb-4">
                Adjust the times for each booking to resolve the conflict. {allConflictingBookings.length} booking{allConflictingBookings.length !== 1 ? 's' : ''} to manage:
              </p>
              <div className="grid gap-4">
                {allConflictingBookings.map((booking, index) => 
                  renderBookingCard(booking, index === 0)
                )}
              </div>
            </div>
          )}

          {selectedAction === 'delete_booking' && (
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Delete Booking</h4>
              <p className="text-sm text-gray-600 mb-4">
                Select which booking to delete ({allConflictingBookings.length} total):
              </p>
              <div className="grid gap-4">
                {allConflictingBookings.map((booking, index) => 
                  renderBookingCard(booking, index === 0)
                )}
              </div>
            </div>
          )}

          {selectedAction === 'reject_enquiry' && (
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Reject New Enquiry</h4>
              <p className="text-sm text-gray-600 mb-4">
                Provide a reason for rejecting this enquiry:
              </p>
              <Textarea
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="min-h-[100px]"
              />
              <Button 
                onClick={handleRejectNewEnquiry}
                disabled={updateBookingMutation.isPending || !rejectReason.trim()}
                variant="destructive"
                className="w-full"
              >
                {updateBookingMutation.isPending ? 'Rejecting...' : 'Reject Enquiry'}
              </Button>
            </div>
          )}

          {/* Show current conflict details if no action selected */}
          {!selectedAction && (
            <div className="space-y-4">
              <h4 className="font-medium text-lg">Conflict Details</h4>
              <div className="grid gap-4">
                {allConflictingBookings.map((booking, index) => 
                  <Card key={booking.id} className={`${index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Badge variant={index === 0 ? "default" : "destructive"} className="mb-2">
                            {index === 0 ? 'New Enquiry' : 'Conflicting Booking'}
                          </Badge>
                          <h5 className="font-medium">{booking.title || `${booking.clientName} - Event`}</h5>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {booking.status || 'pending'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>Client: {booking.clientName}</div>
                        <div>Venue: {booking.venue || 'Not specified'}</div>
                        <div>Time: {booking.eventTime || 'Not set'} {booking.eventEndTime ? `- ${booking.eventEndTime}` : ''}</div>
                        <div>Type: {booking.type || 'enquiry'}</div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}