/**
 * CLEAN CONFLICT DETECTION ENGINE
 * Built from scratch - no legacy logic
 */

export interface ConflictDetectionResult {
  hasConflict: boolean;
  severity: 'critical' | 'warning' | 'none';
  type: 'time_overlap' | 'same_day' | 'none';
  message: string;
  details: {
    booking1: BookingInfo;
    booking2: BookingInfo;
    overlapMinutes?: number;
  };
}

export interface BookingInfo {
  id: number;
  clientName: string;
  eventDate: string;
  eventTime?: string;
  eventEndTime?: string;
  venue?: string;
  status: string;
}

export class ConflictEngine {
  /**
   * Check if two bookings have a time conflict
   */
  static detectConflict(booking1: BookingInfo, booking2: BookingInfo): ConflictDetectionResult {
    // Skip if either booking lacks required data
    if (!booking1.eventDate || !booking2.eventDate) {
      return this.noConflict(booking1, booking2);
    }

    // Parse dates
    const date1 = new Date(booking1.eventDate);
    const date2 = new Date(booking2.eventDate);

    // Different dates = no conflict
    if (date1.toDateString() !== date2.toDateString()) {
      return this.noConflict(booking1, booking2);
    }

    // Same date - check time overlap
    return this.checkTimeOverlap(booking1, booking2, date1);
  }

  /**
   * Check for time overlap on the same date
   */
  private static checkTimeOverlap(
    booking1: BookingInfo, 
    booking2: BookingInfo, 
    eventDate: Date
  ): ConflictDetectionResult {
    // If either booking lacks time info, assume same-day warning
    if (!booking1.eventTime || !booking2.eventTime) {
      return {
        hasConflict: true,
        severity: 'warning',
        type: 'same_day',
        message: 'Same day booking - times not specified',
        details: { booking1, booking2 }
      };
    }

    // Parse start times
    const start1 = this.parseTime(booking1.eventTime, eventDate);
    const start2 = this.parseTime(booking2.eventTime, eventDate);

    if (!start1 || !start2) {
      return this.noConflict(booking1, booking2);
    }

    // Parse end times (default to 2 hours if not specified)
    const end1 = booking1.eventEndTime 
      ? this.parseTime(booking1.eventEndTime, eventDate)
      : new Date(start1.getTime() + (2 * 60 * 60 * 1000)); // +2 hours

    const end2 = booking2.eventEndTime 
      ? this.parseTime(booking2.eventEndTime, eventDate)
      : new Date(start2.getTime() + (2 * 60 * 60 * 1000)); // +2 hours

    if (!end1 || !end2) {
      return this.noConflict(booking1, booking2);
    }

    // Check for time overlap
    const overlap = this.calculateOverlap(start1, end1, start2, end2);

    if (overlap > 0) {
      return {
        hasConflict: true,
        severity: 'critical',
        type: 'time_overlap',
        message: `Time overlap: ${overlap} minutes`,
        details: { 
          booking1, 
          booking2, 
          overlapMinutes: overlap 
        }
      };
    }

    // Same day but no time overlap
    return {
      hasConflict: true,
      severity: 'warning',
      type: 'same_day',
      message: 'Same day booking - no time overlap',
      details: { booking1, booking2 }
    };
  }

  /**
   * Parse time string into Date object
   */
  private static parseTime(timeStr: string, baseDate: Date): Date | null {
    try {
      // Handle common time formats: "14:30", "2:30 PM", "14:30:00"
      const cleanTime = timeStr.trim().toLowerCase();
      
      // Extract hour and minute
      let hour: number, minute: number = 0;
      
      if (cleanTime.includes('pm') || cleanTime.includes('am')) {
        // 12-hour format
        const matches = cleanTime.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/);
        if (!matches) return null;
        
        hour = parseInt(matches[1]);
        minute = matches[2] ? parseInt(matches[2]) : 0;
        
        if (matches[3] === 'pm' && hour !== 12) hour += 12;
        if (matches[3] === 'am' && hour === 12) hour = 0;
      } else {
        // 24-hour format
        const parts = cleanTime.split(':');
        hour = parseInt(parts[0]);
        minute = parts[1] ? parseInt(parts[1]) : 0;
      }

      // Validate
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
      }

      // Create date with correct time
      const result = new Date(baseDate);
      result.setHours(hour, minute, 0, 0);
      return result;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate overlap in minutes between two time ranges
   */
  private static calculateOverlap(
    start1: Date, 
    end1: Date, 
    start2: Date, 
    end2: Date
  ): number {
    // Find overlap period
    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));

    // If start >= end, no overlap
    if (overlapStart >= overlapEnd) {
      return 0;
    }

    // Return overlap in minutes
    return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
  }

  /**
   * Return no conflict result
   */
  private static noConflict(booking1: BookingInfo, booking2: BookingInfo): ConflictDetectionResult {
    return {
      hasConflict: false,
      severity: 'none',
      type: 'none',
      message: 'No conflict detected',
      details: { booking1, booking2 }
    };
  }

  /**
   * Detect all conflicts for a user's bookings
   */
  static detectAllConflicts(bookings: BookingInfo[]): ConflictDetectionResult[] {
    const conflicts: ConflictDetectionResult[] = [];

    // Only check confirmed/active bookings for conflicts
    const activeBookings = bookings.filter(b => 
      b.status !== 'rejected' && 
      b.status !== 'cancelled' && 
      b.status !== 'completed'
    );

    // Compare each booking with every other booking
    for (let i = 0; i < activeBookings.length; i++) {
      for (let j = i + 1; j < activeBookings.length; j++) {
        const result = this.detectConflict(activeBookings[i], activeBookings[j]);
        if (result.hasConflict) {
          conflicts.push(result);
        }
      }
    }

    return conflicts;
  }
}