/**
 * FIXED: Single source of truth for booking data formatting
 * Handles database field migration and ensures consistent frontend format
 */

/**
 * Extract fee range from Encore email titles
 */
function extractFeeRange(text: string): string | null {
  if (!text) return null;
  
  // Look for patterns like "£260-450" or "£260-£450"
  const feeRangeMatch = text.match(/£(\d+)-(?:£)?(\d+)/);
  if (feeRangeMatch) {
    return `£${feeRangeMatch[1]}-${feeRangeMatch[2]}`;
  }
  
  return null;
}

/**
 * Clean up Encore booking titles by removing email formatting prefixes
 */
export function cleanEncoreTitle(rawTitle: string): string {
  if (!rawTitle) return rawTitle;
  
  let cleaned = rawTitle;
  
  // Remove common email forwarding prefixes
  cleaned = cleaned.replace(/^(Fwd:\s*|RE:\s*|Re:\s*)/i, '');
  
  // Remove "Job Alert:" prefix and fee range from Encore emails
  cleaned = cleaned.replace(/^Job Alert:\s*£\d+-\d+,\s*/i, '');
  
  // Remove just "Job Alert:" if no fee
  cleaned = cleaned.replace(/^Job Alert:\s*/i, '');
  
  // Clean up the title to extract just the event description
  // Look for patterns like "Saxophonist needed for private event in Southam"
  const eventMatch = cleaned.match(/(?:Urgent:\s*)?(.+?\s+needed for\s+(.+?))(?:\s+in\s+.+?)?(?:\s+\[.+?\])?$/i);
  if (eventMatch && eventMatch[2]) {
    const eventType = eventMatch[2].trim();
    // Capitalize first letter of each word for event type
    return eventType
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  // Fallback: just remove common patterns and return cleaned title
  cleaned = cleaned.replace(/\s+\[.+?\]$/, ''); // Remove reference codes like [1Q4qx]
  cleaned = cleaned.trim();
  
  return cleaned || rawTitle;
}

/**
 * Extract area/location from Encore booking titles
 * For Encore bookings, the venue is never revealed - only the area
 * Format: "Saxophonist needed for birthday party in Hale"
 */
export function extractEncoreArea(rawTitle: string): string | null {
  if (!rawTitle) return null;
  
  let cleaned = rawTitle;
  
  // Remove common email forwarding prefixes
  cleaned = cleaned.replace(/^(Fwd:\s*|RE:\s*|Re:\s*)/i, '');
  
  // Remove "Job Alert:" prefix and fee range
  cleaned = cleaned.replace(/^Job Alert:\s*£\d+-\d+,\s*/i, '');
  cleaned = cleaned.replace(/^Job Alert:\s*/i, '');
  
  // Extract area from patterns like "...in Hale" or "...in Birmingham"
  const areaMatch = cleaned.match(/\bin\s+([^[\]]+?)(?:\s*\[.+?\])?$/i);
  if (areaMatch) {
    const area = areaMatch[1].trim();
    console.log(`🎵 Extracted Encore area from title: "${area}"`);
    return area;
  }
  
  return null;
}

export interface FormattedBooking {
  id: number;
  userId: string;
  title: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  eventDate?: Date;
  // FIXED: Guaranteed string fields (never undefined) for consistent frontend usage
  eventTime: string; // Always a string, empty if not set
  eventEndTime: string; // Always a string, empty if not set
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
 * MIGRATION-SAFE: Format a single booking from raw database data
 * Handles both old field names (during migration) and new field names
 */
export function formatBooking(rawBooking: any): FormattedBooking {
  if (!rawBooking) {
    console.warn('formatBooking called with null/undefined booking');
    return null as any;
  }
  
  const formatted: FormattedBooking = { 
    ...rawBooking,
    // CRITICAL: Ensure eventTime/eventEndTime are always strings
    eventTime: '',
    eventEndTime: '',
    title: (() => {
      const rawTitle = rawBooking.title || rawBooking.eventType || 'Untitled Event';
      
      // Clean Encore titles if this is an Encore booking
      if (rawBooking.applyNowLink || (rawTitle && rawTitle.toLowerCase().includes('encore'))) {
        return cleanEncoreTitle(rawTitle);
      }
      
      return rawTitle;
    })(),
    clientName: rawBooking.clientName || 'Unknown Client',
    status: rawBooking.status || 'new'
  };
  
  // MIGRATION LOGIC: Handle both old and new field names
  // Priority: new fields → old fields → fallback
  
  // Event time mapping - clean separate fields only
  if (rawBooking.eventTime) {
    formatted.eventTime = rawBooking.eventTime;
  } else if (rawBooking.event_start_time) {
    formatted.eventTime = rawBooking.event_start_time;
  } else if (rawBooking.eventStartTime) {
    formatted.eventTime = rawBooking.eventStartTime;
  } else {
    formatted.eventTime = '';
  }
  
  // Event end time mapping - clean separate fields only
  if (rawBooking.eventEndTime) {
    formatted.eventEndTime = rawBooking.eventEndTime;
  } else if (rawBooking.event_end_time) {
    formatted.eventEndTime = rawBooking.event_end_time;
  } else if (rawBooking.event_finish_time) {
    formatted.eventEndTime = rawBooking.event_finish_time;
  } else if (rawBooking.eventFinishTime) {
    formatted.eventEndTime = rawBooking.eventFinishTime;
  } else {
    formatted.eventEndTime = '';
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