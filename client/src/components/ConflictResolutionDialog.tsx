import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, User, Phone, Mail } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryBooking: any;
  conflictingBookings: any[];
  onResolved: () => void;
  conflictSeverity?: 'critical' | 'warning';
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  primaryBooking,
  conflictingBookings,
  onResolved,
  conflictSeverity = 'critical'
}: ConflictResolutionDialogProps) {
  const [editingBooking, setEditingBooking] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});
  const { toast } = useToast();

  const handleEdit = (booking: any) => {
    setEditingBooking(booking);
    setFormData({
      title: booking.title || '',
      clientName: booking.clientName || '',
      clientEmail: booking.clientEmail || '',
      clientPhone: booking.clientPhone || '',
      eventDate: booking.eventDate ? format(new Date(booking.eventDate), 'yyyy-MM-dd') : '',
      eventTime: booking.eventTime || '',
      eventEndTime: booking.eventEndTime || '',
      venue: booking.venue || '',
      eventType: booking.eventType || '',
      status: booking.status || 'new',
      notes: booking.notes || ''
    });
  };

  const handleSave = async () => {
    if (!editingBooking) return;

    try {
      await apiRequest(`/api/bookings/${editingBooking.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData)
      });

      toast({
        title: "Booking Updated",
        description: `${editingBooking.title} has been updated successfully.`
      });

      setEditingBooking(null);
      onResolved();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditingBooking(null);
    setFormData({});
  };

  const handleResolve = async () => {
    // For orange conflicts (same date, different times), mark as resolved
    try {
      toast({
        title: "Conflict Resolved",
        description: "The scheduling conflict has been marked as resolved. The bookings can coexist with different times.",
        variant: "default"
      });
      
      onResolved();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve conflict. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReject = async (booking: any) => {
    try {
      await apiRequest(`/api/bookings/${booking.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'rejected' })
      });

      toast({
        title: "Booking Rejected",
        description: `${booking.title} has been rejected and removed from the conflict.`
      });

      onResolved();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    // Using simplified booking page color scheme
    switch(status?.toLowerCase()) {
      case 'new':
      case 'enquiry':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'awaiting_response':
      case 'in_progress':
      case 'booking_in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'client_confirms':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'confirmed':
      case 'contract_signed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const BookingCard = ({ booking, isConflicting = false }: { booking: any, isConflicting?: boolean }) => (
    <div className={`p-4 border rounded-lg ${isConflicting ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">{booking?.eventType || booking?.clientName || booking?.title || 'Unknown Event'}</h3>
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(booking.status)}>
            {booking.status?.replace('_', ' ').toUpperCase()}
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
          <span>{booking.clientName || 'No client name'}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Mail className="w-4 h-4 text-gray-500" />
          <span>{booking.clientEmail || 'No email'}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-gray-500" />
          <span>{booking.clientPhone || 'No phone'}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <CalendarDays className="w-4 h-4 text-gray-500" />
          <span>{booking.eventDate ? format(new Date(booking.eventDate), 'PPP') : 'No date'}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span>{booking.eventTime || 'No time'} - {booking.eventEndTime || 'No end time'}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span>{booking.venue || 'No venue'}</span>
        </div>
      </div>

      {booking.notes && (
        <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
          <strong>Notes:</strong> {booking.notes}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${conflictSeverity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
            <span>Booking Conflict Resolution</span>
          </DialogTitle>
        </DialogHeader>

        {!editingBooking ? (
          <div className="space-y-6">
            <div className={`border rounded-lg p-4 ${
              conflictSeverity === 'critical' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-amber-50 border-amber-200'
            }`}>
              <h4 className={`font-medium mb-2 ${
                conflictSeverity === 'critical' ? 'text-red-800' : 'text-amber-800'
              }`}>
                {conflictSeverity === 'critical' ? 'Critical Conflict Detected' : 'Scheduling Conflict Detected'}
              </h4>
              <p className={`text-sm ${
                conflictSeverity === 'critical' ? 'text-red-700' : 'text-amber-700'
              }`}>
                {conflictSeverity === 'critical' 
                  ? 'The following bookings have overlapping times creating a double booking risk. Edit or reject bookings to resolve the conflict.'
                  : 'The following bookings are on the same date but have different times. Review to ensure they can coexist or resolve the conflict.'
                }
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Primary Booking</h4>
                <BookingCard booking={primaryBooking} />
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Conflicting Bookings</h4>
                <div className="space-y-3">
                  {conflictingBookings.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} isConflicting={true} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {conflictSeverity === 'warning' && (
                <Button 
                  variant="default" 
                  onClick={handleResolve}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Resolve Conflict
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">Editing: {editingBooking.title}</h4>
              <p className="text-blue-700 text-sm">
                Make changes to resolve the conflict. Update the date, time, or status as needed.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="booking_in_progress">In Progress</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="contract_sent">Contract Sent</SelectItem>
                    <SelectItem value="contract_received">Contract Received</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientPhone">Client Phone</Label>
                <Input
                  id="clientPhone"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDate">Event Date</Label>
                <Input
                  id="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventTime">Start Time</Label>
                <Input
                  id="eventTime"
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventEndTime">End Time</Label>
                <Input
                  id="eventEndTime"
                  type="time"
                  value={formData.eventEndTime}
                  onChange={(e) => setFormData({ ...formData, eventEndTime: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType">Event Type</Label>
                <Input
                  id="eventType"
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}