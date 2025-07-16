import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, User, Calendar, MapPin } from 'lucide-react';
import { bookings } from '@shared/schema';

export interface Booking {
  id: number;
  title: string;
  clientName: string;
  eventDate: Date | null;
  eventTime: string | null;
  eventEndTime: string | null;
  venue: string | null;
  status: string;
  conflictDetected: boolean;
  detectedConflicts: any[];
}

export interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enquiry: Booking;
  conflictingBookings: Booking[];
  onResolve: (enquiryId: number, bookingId: number, newTime: { startTime: string; endTime: string }) => void;
}

interface TimeState {
  [key: string]: {
    startTime: string;
    endTime: string;
  };
}

export default function ConflictResolutionDialog({
  isOpen,
  onClose,
  enquiry,
  conflictingBookings,
  onResolve
}: ConflictResolutionDialogProps) {
  const [editMode, setEditMode] = useState(false);
  const [timeState, setTimeState] = useState<TimeState>({});

  if (!enquiry || !conflictingBookings) return null;

  const conflictCount = conflictingBookings.length;
  const totalBookings = conflictCount + 1; // +1 for the new enquiry

  const formatDate = (date: Date | null) => {
    if (!date) return 'No date';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string | null) => {
    if (!time) return 'No time';
    return time;
  };

  const initializeTimeState = () => {
    const initial: TimeState = {};
    
    // Add new enquiry
    initial[`enquiry-${enquiry.id}`] = {
      startTime: enquiry.eventTime || '',
      endTime: enquiry.eventEndTime || ''
    };
    
    // Add conflicting bookings
    conflictingBookings.forEach(booking => {
      initial[`booking-${booking.id}`] = {
        startTime: booking.eventTime || '',
        endTime: booking.eventEndTime || ''
      };
    });
    
    setTimeState(initial);
  };

  const handleEditToggle = () => {
    if (!editMode) {
      initializeTimeState();
    }
    setEditMode(!editMode);
  };

  const handleTimeChange = (key: string, field: 'startTime' | 'endTime', value: string) => {
    setTimeState(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const handleUpdateTime = (bookingId: number, isEnquiry: boolean) => {
    const key = isEnquiry ? `enquiry-${bookingId}` : `booking-${bookingId}`;
    const time = timeState[key];
    
    if (time) {
      onResolve(enquiry.id, bookingId, {
        startTime: time.startTime,
        endTime: time.endTime
      });
    }
  };

  const renderBookingCard = (booking: Booking, isNewEnquiry: boolean) => {
    const key = isNewEnquiry ? `enquiry-${booking.id}` : `booking-${booking.id}`;
    const currentTime = timeState[key];
    
    return (
      <Card key={booking.id} className={`${isNewEnquiry ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isNewEnquiry ? (
              <span className="text-blue-600">New Enquiry</span>
            ) : (
              <span className="text-gray-600">Existing Booking</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="font-medium">{booking.clientName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>{formatDate(booking.eventDate)}</span>
            </div>
            {booking.venue && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{booking.venue}</span>
              </div>
            )}
          </div>
          
          {editMode && currentTime ? (
            <div className="space-y-3 pt-2 border-t">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`start-${key}`}>Start Time</Label>
                  <Input
                    id={`start-${key}`}
                    type="time"
                    value={currentTime.startTime}
                    onChange={(e) => handleTimeChange(key, 'startTime', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`end-${key}`}>End Time</Label>
                  <Input
                    id={`end-${key}`}
                    type="time"
                    value={currentTime.endTime}
                    onChange={(e) => handleTimeChange(key, 'endTime', e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={() => handleUpdateTime(booking.id, isNewEnquiry)}
                size="sm"
                className="w-full"
              >
                <Clock className="h-4 w-4 mr-2" />
                Update Time
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{formatTime(booking.eventTime)} - {formatTime(booking.eventEndTime)}</span>
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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Scheduling Conflict - {totalBookings} booking{totalBookings > 1 ? 's' : ''}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">
              {conflictCount} booking{conflictCount > 1 ? 's' : ''} conflict with this new enquiry. 
              Review the times below and adjust as needed to resolve the conflict.
            </p>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleEditToggle}
              className="gap-2"
            >
              <Clock className="h-4 w-4" />
              {editMode ? 'Cancel Edit' : 'Edit booking times to avoid overlap'}
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* New Enquiry */}
            {renderBookingCard(enquiry, true)}
            
            {/* Conflicting Bookings */}
            {conflictingBookings.map(booking => renderBookingCard(booking, false))}
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}