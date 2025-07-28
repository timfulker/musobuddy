/**
 * Single source of truth for booking data formatting
 * All booking data transformations should go through this utility
 */

export interface FormattedBooking {
  id: number;
  userId: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  eventDate?: Date;
  eventTime?: string; // Formatted as "19:00 - 22:00" or single time
  eventEndTime?: string; // Raw end time from database
  performanceDuration?: string;
  venue?: string;
  eventType?: string;
  gigType?: string;
  estimatedValue?: string;
  status: string;
  notes?: string;
  originalEmailContent?: string;
  applyNowLink?: string;
  responseNeeded?: boolean;
  lastContactedAt?: Date;
  hasConflicts?: boolean;
  conflictCount?: number;
  conflictDetails?: string;
  createdAt?: Date;
  updatedAt?: Date;
  previousStatus?: string;
  contractSent?: boolean;
  contractSigned?: boolean;
  invoiceSent?: boolean;
  paidInFull?: boolean;
  depositPaid?: boolean;
  quotedAmount?: number;
  depositAmount?: number;
  finalAmount?: number;
  completed?: boolean;
  venueAddress?: string;
  clientAddress?: string;
  equipmentRequirements?: string;
  specialRequirements?: string;
  fee?: number;
  styles?: string;
  equipmentProvided?: string;
  whatsIncluded?: string;
  uploadedContractUrl?: string;
  uploadedContractKey?: string;
  uploadedContractFilename?: string;
  uploadedInvoiceUrl?: string;
  uploadedInvoiceKey?: string;
  uploadedInvoiceFilename?: string;
  uploadedDocuments?: any[];
}

/**
 * Format a single booking from raw database data
 */
export function formatBooking(rawBooking: any): FormattedBooking {
  if (!rawBooking) return rawBooking;
  
  const formatted: FormattedBooking = { ...rawBooking };
  
  // Format time range consistently
  if (rawBooking.eventTime && rawBooking.eventEndTime) {
    formatted.eventTime = `${rawBooking.eventTime} - ${rawBooking.eventEndTime}`;
  }
  
  return formatted;
}

/**
 * Format multiple bookings from raw database data
 */
export function formatBookings(rawBookings: any[]): FormattedBooking[] {
  if (!Array.isArray(rawBookings)) return [];
  
  return rawBookings.map(formatBooking);
}

/**
 * Get raw time components for conflict detection
 */
export function parseBookingTime(booking: FormattedBooking): { startTime: string; endTime: string } | null {
  if (!booking.eventTime) return null;
  
  // If formatted time range "19:00 - 22:00"
  if (booking.eventTime.includes(' - ')) {
    const [startTime, endTime] = booking.eventTime.split(' - ');
    return { startTime: startTime.trim(), endTime: endTime.trim() };
  }
  
  // If single time, use both eventTime and eventEndTime from raw data
  if (booking.eventEndTime) {
    return { startTime: booking.eventTime, endTime: booking.eventEndTime };
  }
  
  return null;
}

/**
 * Check if two bookings have overlapping times
 */
export function hasTimeOverlap(booking1: FormattedBooking, booking2: FormattedBooking): boolean {
  const time1 = parseBookingTime(booking1);
  const time2 = parseBookingTime(booking2);
  
  if (!time1 || !time2) return false;
  
  // Convert times to minutes for comparison
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };
  
  const start1 = parseTime(time1.startTime);
  const end1 = parseTime(time1.endTime);
  const start2 = parseTime(time2.startTime);
  const end2 = parseTime(time2.endTime);
  
  // Check for overlap: start1 < end2 && end1 > start2
  return start1 < end2 && end1 > start2;
}