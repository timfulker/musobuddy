import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, DollarSign, User, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';

interface BookingDetailsDialogProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingDetailsModal({ booking, isOpen, onClose }: BookingDetailsDialogProps) {
  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Client</span>
              </div>
              <div className="text-gray-600">{booking.clientName}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Date</span>
              </div>
              <div className="text-gray-600">
                {booking.eventDate ? format(new Date(booking.eventDate), 'PPP') : 'No date set'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Time</span>
              </div>
              <div className="text-gray-600">{booking.eventTime || 'No time set'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Venue</span>
              </div>
              <div className="text-gray-600">{booking.venue || 'No venue set'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Fee</span>
              </div>
              <div className="text-gray-600">{booking.estimatedValue || 'Price TBC'}</div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status</span>
              </div>
              <div className="text-gray-600 capitalize">{booking.status}</div>
            </div>
          </div>
          
          {booking.clientContact && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Contact</span>
              </div>
              <div className="text-gray-600">{booking.clientContact}</div>
            </div>
          )}
          
          {booking.clientEmail && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Email</span>
              </div>
              <div className="text-gray-600">{booking.clientEmail}</div>
            </div>
          )}
          
          {booking.eventType && (
            <div className="space-y-2">
              <span className="font-medium">Event Type</span>
              <div className="text-gray-600">{booking.eventType}</div>
            </div>
          )}
          
          {booking.gigType && (
            <div className="space-y-2">
              <span className="font-medium">Gig Type</span>
              <div className="text-gray-600">{booking.gigType}</div>
            </div>
          )}
          
          {booking.message && (
            <div className="space-y-2">
              <span className="font-medium">Message</span>
              <div className="text-gray-600 whitespace-pre-wrap">{booking.message}</div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}