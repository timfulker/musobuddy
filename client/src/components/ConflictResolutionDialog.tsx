import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflictingBookings: any[];
  onResolveConflict?: (bookingToKeep: any) => void;
}

export default function ConflictResolutionDialog({
  isOpen,
  onClose,
  conflictingBookings = [],
  onResolveConflict
}: ConflictResolutionDialogProps) {
  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Resolve Booking Conflicts
          </DialogTitle>
          <DialogDescription>
            Multiple bookings are scheduled for the same time. Select which booking to keep.
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
                      <span className="font-medium">{booking.clientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{formatDate(booking.eventDate)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">
                        {booking.eventTime} - {booking.eventEndTime || 'TBC'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{booking.venue}</span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Event:</span> {booking.eventType} | 
                    <span className="font-medium ml-2">Fee:</span> £{booking.agreedFee || 'TBC'}
                  </div>
                </div>

                <div className="ml-4">
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
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleResolve}
            disabled={!selectedBooking}
            className="bg-red-600 hover:bg-red-700"
          >
            Keep Selected Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}