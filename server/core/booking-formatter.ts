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
  // Unified time fields for frontend compatibility
  eventTime?: string; // Start time from database (mapped from event_start_time)
  eventEndTime?: string; // End time from database (mapped from event_finish_time)
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
  
  // Map database field names to frontend expectations
  formatted.eventTime = rawBooking.event_start_time || rawBooking.eventStartTime || null;
  formatted.eventEndTime = rawBooking.event_finish_time || rawBooking.eventFinishTime || null;
  
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
  // Use the unified time fields (mapped from database)
  if (booking.eventTime && booking.eventEndTime) {
    return { startTime: booking.eventTime, endTime: booking.eventEndTime };
  }
  
  return null;
}

/**
 * Check if two bookings have overlapping times or missing times (hard conflicts)
 */
export function hasTimeOverlap(booking1: FormattedBooking, booking2: FormattedBooking): boolean {
  const time1 = parseBookingTime(booking1);
  const time2 = parseBookingTime(booking2);
  
  // CRITICAL FIX: Missing times = Hard conflicts (cannot determine overlap)
  if (!time1 || !time2) return true;
  
  // Convert times to minutes for comparison
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  };
  
  const start1 = parseTime(time1.startTime);
  const end1 = parseTime(time1.endTime);
  const start2 = parseTime(time2.startTime);
  const end2 = parseTime(time2.endTime);
  
  // Debug logging to track conflict detection
  console.log(`🔍 Time overlap check:
    Booking 1: ${time1.startTime}-${time1.endTime} (${start1}-${end1} minutes)
    Booking 2: ${time2.startTime}-${time2.endTime} (${start2}-${end2} minutes)
    Overlap formula: ${start1} < ${end2} && ${end1} > ${start2}
    Result: ${start1 < end2 && end1 > start2}`);
  
  // Check for overlap: start1 < end2 && end1 > start2
  return start1 < end2 && end1 > start2;
}