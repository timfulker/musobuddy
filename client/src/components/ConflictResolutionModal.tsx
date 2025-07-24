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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calendar, Clock, MapPin, User } from "lucide-react";

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
  bookingId: number;
}

export default function ConflictResolutionModal({ isOpen, onClose, bookingId }: ConflictResolutionModalProps) {
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const { toast } = useToast();

  // Fetch conflict data
  const { data: conflictData, isLoading } = useQuery({
    queryKey: ['/api/conflicts', bookingId],
    enabled: isOpen && !!bookingId,
  });

  // Fetch booking details
  const { data: currentBooking } = useQuery({
    queryKey: ['/api/bookings', bookingId],
    enabled: isOpen && !!bookingId,
  });

  // Fetch conflicting booking details
  const { data: conflictingBooking } = useQuery({
    queryKey: ['/api/bookings', selectedConflict?.withBookingId],
    enabled: !!selectedConflict?.withBookingId,
  });

  // Update booking mutation
  const updateBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/bookings/${editingBooking.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking updated",
        description: "The booking has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setEditingBooking(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reject booking mutation
  const rejectBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Booking rejected",
        description: "The booking has been rejected and removed.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setSelectedConflict(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject booking. Please try again.",
        variant: "destructive",
      });
    },
  });

  const conflicts = conflictData?.conflicts || [];

  const handleEditTime = (booking: any) => {
    setEditingBooking({
      ...booking,
      eventTime: booking.eventTime || '',
      eventEndTime: booking.eventEndTime || '',
    });
  };

  const handleSaveTimeEdit = () => {
    if (!editingBooking) return;
    
    updateBookingMutation.mutate({
      eventTime: editingBooking.eventTime,
      eventEndTime: editingBooking.eventEndTime,
    });
  };

  const handleRejectBooking = (bookingId: number) => {
    if (window.confirm('Are you sure you want to reject this booking? This cannot be undone.')) {
      rejectBookingMutation.mutate(bookingId);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading Conflicts...</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (conflicts.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>No Conflicts Found</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <p className="text-muted-foreground">This booking has no conflicts.</p>
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
          <DialogTitle>
            ⚠️ Conflict detected between {conflicts.length + 1} bookings on{' '}
            {currentBooking?.eventDate ? new Date(currentBooking.eventDate).toLocaleDateString() : 'this date'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Show first conflict in side-by-side layout */}
          {conflicts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Booking (Left Side) */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Current Booking</h3>
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{currentBooking?.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={currentBooking?.status === 'confirmed' ? 'default' : 'secondary'}>
                        {currentBooking?.status || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {currentBooking?.eventTime && currentBooking?.eventEndTime
                          ? `${currentBooking.eventTime} – ${currentBooking.eventEndTime}`
                          : 'Time not specified'}
                      </span>
                    </div>
                    {currentBooking?.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{currentBooking.venue}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditTime(currentBooking)}
                    >
                      Edit Time
                    </Button>
                    {(currentBooking?.status === 'enquiry' || currentBooking?.status === 'new') && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRejectBooking(currentBooking.id)}
                      >
                        Reject Booking
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      View Full Booking
                    </Button>
                  </div>
                </div>
              </div>

              {/* Conflicting Booking (Right Side) */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Conflicting Booking</h3>
                <div className="p-4 border rounded-lg bg-red-50">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{conflicts[0].clientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={conflicts[0].status === 'confirmed' ? 'default' : 'secondary'}>
                        {conflicts[0].status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{conflicts[0].time}</span>
                    </div>
                    {conflictingBooking?.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{conflictingBooking.venue}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 space-x-2">
                    {conflicts[0].canEdit && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditTime(conflictingBooking)}
                      >
                        Edit Time
                      </Button>
                    )}
                    {conflicts[0].canReject && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleRejectBooking(conflicts[0].withBookingId)}
                        disabled={conflicts[0].status === 'confirmed'}
                        title={conflicts[0].status === 'confirmed' ? 'Confirmed bookings must be edited or deleted from the full booking form.' : ''}
                      >
                        Reject Booking
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      View Booking
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show additional conflicts if any */}
          {conflicts.length > 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Additional Conflicts ({conflicts.length - 1})</h3>
              <div className="space-y-2">
                {conflicts.slice(1).map((conflict, index) => (
                  <div key={index} className="p-3 border rounded bg-orange-50 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{conflict.clientName}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({conflict.status}) - {conflict.time}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedConflict(conflict)}
                    >
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Edit Modal */}
          {editingBooking && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <h3 className="font-semibold mb-4">Edit Booking Time</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="eventTime">Start Time</Label>
                    <Input
                      id="eventTime"
                      type="time"
                      value={editingBooking.eventTime}
                      onChange={(e) => setEditingBooking({
                        ...editingBooking,
                        eventTime: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventEndTime">End Time</Label>
                    <Input
                      id="eventEndTime"
                      type="time"
                      value={editingBooking.eventEndTime}
                      onChange={(e) => setEditingBooking({
                        ...editingBooking,
                        eventEndTime: e.target.value
                      })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveTimeEdit} disabled={updateBookingMutation.isPending}>
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingBooking(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={() => {
                // Refresh conflicts after changes
                queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
                toast({
                  title: "Conflicts rechecked",
                  description: "The system has rechecked for conflicts.",
                });
              }}
            >
              Save & Recheck Conflicts
            </Button>
          </div>

          {/* Future Feature Placeholder */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <Button disabled variant="outline" className="w-full">
              Assign Dep Musician (coming soon)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}