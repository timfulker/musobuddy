import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

interface SendComplianceDialogProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function SendComplianceDialog({ booking, isOpen, onClose }: SendComplianceDialogProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    // TODO: Implement compliance sending logic
    console.log('Sending compliance for booking:', booking?.id, 'Message:', message);
    onClose();
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Compliance Information</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="client">Client</Label>
            <div className="text-sm text-gray-600">{booking.clientName}</div>
          </div>
          
          <div>
            <Label htmlFor="event">Event</Label>
            <div className="text-sm text-gray-600">
              {booking.venue} - {booking.eventDate}
            </div>
          </div>
          
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your compliance message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend}>
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}