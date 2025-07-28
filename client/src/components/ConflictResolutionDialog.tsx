import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { CalendarDays, Clock, MapPin, User, Mail, Phone, X, Edit, Trash } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBooking: any;
  conflicts: any[];
}

export function ConflictResolutionDialog({
  isOpen,
  onClose,
  selectedBooking,
  conflicts
}: ConflictResolutionDialogProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionAction, setResolutionAction] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleResolve = async (action: string, bookingId: string) => {
    try {
      setIsResolving(true);
      
      await apiRequest(`/api/bookings/${bookingId}/resolve-conflict`, {
        method: 'PATCH',
        body: JSON.stringify({ action, resolutionNotes: `Conflict resolved via ${action}` })
      });

      toast({
        title: "Conflict Resolved",
        description: `Booking conflict has been resolved successfully.`,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      
      onClose();
    } catch (error) {
      console.error('Error resolving conflict:', error);
      toast({
        title: "Error",
        description: "Failed to resolve conflict. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleEdit = (booking: any) => {
    
    toast({
      title: "Edit Booking",
      description: "This will open the booking edit form",
    });
  };

  const handleReject = async (booking: any) => {
    if (!booking?.id) return;
    
    try {
      await handleResolve('reject', booking.id);
    } catch (error) {
      console.error('Error rejecting booking:', error);
    }
  };

  if (!selectedBooking) return null;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
      case 'enquiry':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'in_progress':
      case 'awaiting_response':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'client_confirms':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'contract_sent':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const BookingCard = ({ booking, isConflicting = false }: { booking: any, isConflicting?: boolean }) => {
    if (!booking) {
      return (
        <div className="p-4 border rounded-lg border-gray-200 bg-gray-50">
          <div className="text-gray-500">Booking data not available</div>
        </div>
      );
    }

    return (
      <div className={`p-4 border rounded-lg ${isConflicting ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">{booking?.eventType || booking?.clientName || booking?.title || 'Unknown Event'}</h3>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(booking?.status)}>
              {booking?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(booking)}
              className="text-xs"
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleReject(booking)}
              className="text-xs"
            >
              Reject
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500" />
            <span>{booking?.clientName || 'No client name'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-gray-500" />
            <span>{booking?.clientEmail || 'No email'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <span>{booking?.clientPhone || 'No phone'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <CalendarDays className="w-4 h-4 text-gray-500" />
            <span>{booking?.eventDate ? format(new Date(booking.eventDate), 'PPP') : 'No date'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>{booking?.eventTime || 'No time'} - {booking?.eventEndTime || 'No end time'}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>{booking?.venue || 'No venue'}</span>
          </div>
        </div>

        {booking?.notes && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
            <strong>Notes:</strong> {booking.notes}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Conflict Resolution</span>
            <Badge variant="destructive">
              {conflicts?.length || 0} Conflict{(conflicts?.length || 0) !== 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Resolve scheduling conflicts between bookings. Review the conflicting bookings below and choose an action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Booking */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-red-600">Primary Booking (Selected)</h3>
            <BookingCard booking={selectedBooking} isConflicting={true} />
          </div>

          {/* Conflicting Bookings */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-orange-600">Conflicting Bookings</h3>
            <div className="space-y-3">
              {conflicts && conflicts.length > 0 ? (
                conflicts.map((conflict, index) => (
                  <BookingCard key={conflict?.id || index} booking={conflict} isConflicting={false} />
                ))
              ) : (
                <div className="text-gray-500 text-sm">No conflicting bookings found</div>
              )}
            </div>
          </div>

          {/* Resolution Actions */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-3">Resolution Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleResolve('reschedule', selectedBooking?.id)}
                disabled={isResolving}
                variant="outline"
              >
                Reschedule Primary Booking
              </Button>
              <Button
                onClick={() => handleResolve('cancel_conflicting', selectedBooking?.id)}
                disabled={isResolving}
                variant="outline"
              >
                Cancel Conflicting Bookings
              </Button>
              <Button
                onClick={() => handleResolve('manual_resolution', selectedBooking?.id)}
                disabled={isResolving}
                variant="outline"
              >
                Mark as Manually Resolved
              </Button>
              <Button
                onClick={onClose}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}