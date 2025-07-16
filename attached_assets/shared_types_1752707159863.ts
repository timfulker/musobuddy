// types/booking.ts
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

export interface Enquiry extends Booking {
  // Any enquiry-specific properties can be added here
}

export interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  enquiry: Booking;
  conflictingBookings: Booking[];
  onResolve: (enquiryId: number, bookingId: number, newTime: { startTime: string; endTime: string }) => void;
}