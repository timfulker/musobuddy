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
  ChevronRight
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
    conflictsReceived: conflicts,
    conflictsLength: conflicts?.length,
    conflictIds: conflicts?.map(c => c?.id),
    isOpen,
    rawConflicts: JSON.stringify(conflicts, null, 2)
  });

  // Additional debugging
  if (conflicts && conflicts.length > 0) {
    console.log('🔥 CONFLICTS EXIST:', conflicts.length, 'conflicts found');
    conflicts.forEach((conflict, index) => {
      console.log(`🔥 Conflict ${index}:`, conflict);
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
    
    // Initialize with all conflicting bookings
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
    
    return initialTimes;
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create all conflicting bookings array (new enquiry + existing conflicts)
  const allConflictingBookings = React.useMemo(() => {
    const allBookings = [enquiry];
    
    // Add conflicts if they exist
    if (Array.isArray(conflicts)) {
      conflicts.forEach(conflict => {
        if (conflict && conflict.id) {
          allBookings.push(conflict);
        }
      });
    }
    
    console.log('🔥 All conflicting bookings:', {
      totalBookings: allBookings.length,
      bookingIds: allBookings.map(b => b.id),
      bookingDetails: allBookings.map(b => ({
        id: b.id,
        title: b.title,
        clientName: b.clientName,
        eventDate: b.eventDate,
        eventTime: b.eventTime
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
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });
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

  const handleUpdateTime = (bookingId: string) => {
    const times = bookingTimes[bookingId];
    if (!times) return;

    updateBookingMutation.mutate({
      id: bookingId,
      eventTime: times.start,
      eventEndTime: times.end
    });
  };

  const handleDeleteBooking = (bookingId: string) => {
    deleteBookingMutation.mutate(bookingId);
  };

  const handleRejectEnquiry = () => {
    updateBookingMutation.mutate({
      id: enquiry.id,
      status: 'rejected',
      notes: rejectReason
    });
  };

  const handleAction = () => {
    if (selectedAction === 'edit_times') {
      // Action already handled by individual update buttons
      return;
    }
    
    if (selectedAction === 'reject') {
      handleRejectEnquiry();
    }
  };

  const handleTimeChange = (bookingId: string, field: 'start' | 'end', value: string) => {
    setBookingTimes(prev => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        [field]: value
      }
    }));
  };

  const renderBookingCard = (booking: any, isNewEnquiry: boolean) => {
    const times = bookingTimes[booking.id] || { start: '', end: '' };

    return (
      <Card key={booking.id} className={`mb-4 ${isNewEnquiry ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                {isNewEnquiry ? (
                  <Badge className="bg-blue-600 text-white">New Enquiry</Badge>
                ) : (
                  <Badge variant="outline" className="border-gray-400">Existing Booking</Badge>
                )}
                {booking.title || booking.clientName}
              </CardTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{booking.eventDate}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{booking.eventTime} - {booking.eventEndTime}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>{booking.clientName}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{booking.venue || 'No venue specified'}</span>
            </div>
            {booking.clientEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{booking.clientEmail}</span>
              </div>
            )}
            {booking.clientPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{booking.clientPhone}</span>
              </div>
            )}
          </div>

          {/* Time editing controls - only show when edit_times is selected */}
          {selectedAction === 'edit_times' && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Edit Time for {isNewEnquiry ? 'New Enquiry' : 'Existing Booking'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`start-${booking.id}`}>Start Time</Label>
                  <Input
                    id={`start-${booking.id}`}
                    type="time"
                    value={times.start}
                    onChange={(e) => handleTimeChange(booking.id, 'start', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`end-${booking.id}`}>End Time</Label>
                  <Input
                    id={`end-${booking.id}`}
                    type="time"
                    value={times.end}
                    onChange={(e) => handleTimeChange(booking.id, 'end', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <Button 
                onClick={() => handleUpdateTime(booking.id)}
                className="mt-3 w-full"
                disabled={updateBookingMutation.isPending}
              >
                {updateBookingMutation.isPending ? 'Updating...' : 'Update Time'}
              </Button>
            </div>
          )}

          {/* Delete option */}
          {selectedAction === 'delete' && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <span className="text-red-700">Delete this booking?</span>
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteBooking(booking.id)}
                  disabled={deleteBookingMutation.isPending}
                >
                  {deleteBookingMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Resolve Booking Conflict
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Overview */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">Conflict Detected</h3>
            <p className="text-red-700">
              {allConflictingBookings.length} bookings are scheduled for the same time slot.
            </p>
          </div>

          {/* All Conflicting Bookings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">All Conflicting Bookings</h3>
            {allConflictingBookings.map((booking, index) => 
              renderBookingCard(booking, index === 0)
            )}
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose Resolution Action</h3>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger>
                <SelectValue placeholder="Select an action to resolve the conflict" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="edit_times">Edit booking times to avoid overlap</SelectItem>
                <SelectItem value="reject">Reject the new enquiry</SelectItem>
                <SelectItem value="delete">Delete a booking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reject Reason */}
          {selectedAction === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for rejection</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejecting this enquiry..."
                className="min-h-[100px]"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {selectedAction === 'reject' && (
              <Button 
                onClick={handleAction}
                disabled={updateBookingMutation.isPending}
                variant="destructive"
              >
                {updateBookingMutation.isPending ? 'Rejecting...' : 'Reject Enquiry'}
              </Button>
            )}
            {selectedAction === 'edit_times' && (
              <Button onClick={onClose} className="bg-green-600 hover:bg-green-700">
                Done Editing
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}