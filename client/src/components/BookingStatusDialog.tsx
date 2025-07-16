import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface BookingStatusDialogProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: number, status: string) => void;
}

export default function BookingStatusDialog({ booking, isOpen, onClose, onUpdateStatus }: BookingStatusDialogProps) {
  const [status, setStatus] = useState(booking?.status || '');

  const handleSave = () => {
    if (booking && status) {
      onUpdateStatus(booking.id, status);
      onClose();
    }
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Booking Status</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="client">Client</Label>
            <div className="text-sm text-gray-600">{booking.clientName}</div>
          </div>
          
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New Enquiry</SelectItem>
                <SelectItem value="booking_in_progress">In Progress</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="contract_sent">Contract Sent</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}