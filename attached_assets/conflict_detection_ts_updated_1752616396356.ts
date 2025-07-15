import { IStorage } from './storage';
import { Enquiry as Booking, Booking as ActualBooking } from '@shared/schema';

export interface ConflictInfo {
  id: number;
  type: 'booking' | 'actualBooking';
  title: string;
  clientName: string;
  eventDate: Date;
  eventTime?: string;
  venue?: string;
  status: string;
}

export interface ConflictAnalysis {
  severity: 'high' | 'medium' | 'low';
  message: string;
  recommendation: string;
  timeOverlap: boolean;
  sameVenue: boolean;
  canReschedule: boolean;
}

export class ConflictDetectionService {
  constructor(private storage: IStorage) {}

  async checkBookingConflicts(booking: Booking, userId: string): Promise<{
    conflicts: ConflictInfo[];
    analysis: ConflictAnalysis | null;
  }> {
    if (!booking.eventDate) {
      return { conflicts: [], analysis: null };
    }

    // Get all actual bookings and other bookings for the same date
    const [actualBookings, bookings] = await Promise.all([
      this.storage.getActualBookings(userId),
      this.storage.getBookings(userId)
    ]);

    const conflicts: ConflictInfo[] = [];
    const bookingDate = new Date(booking.eventDate);

    // Check for actual booking conflicts
    for (const actualBooking of actualBookings) {
      if (this.isSameDay(new Date(actualBooking.eventDate), bookingDate)) {
        conflicts.push({
          id: actualBooking.id,
          type: 'actualBooking',
          title: actualBooking.title,
          clientName: actualBooking.clientName,
          eventDate: new Date(actualBooking.eventDate),
          eventTime: actualBooking.eventTime,
          venue: actualBooking.venue,
          status: actualBooking.status
        });
      }
    }

    // Check for booking conflicts (excluding the current booking)
    for (const otherBooking of bookings) {
      if (otherBooking.id !== booking.id && otherBooking.eventDate) {
        if (this.isSameDay(new Date(otherBooking.eventDate), bookingDate)) {
          conflicts.push({
            id: otherBooking.id,
            type: 'booking',
            title: otherBooking.title,
            clientName: otherBooking.clientName,
            eventDate: new Date(otherBooking.eventDate),
            eventTime: otherBooking.eventTime,
            venue: otherBooking.venue,
            status: otherBooking.status
          });
        }
      }
    }

    const analysis = conflicts.length > 0 ? this.analyzeConflicts(booking, conflicts) : null;

    return { conflicts, analysis };
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private analyzeConflicts(booking: Booking, conflicts: ConflictInfo[]): ConflictAnalysis {
    const confirmedActualBookings = conflicts.filter(c => c.type === 'actualBooking' && c.status === 'confirmed');
    const confirmedBookings = conflicts.filter(c => c.type === 'booking' && c.status === 'confirmed');
    
    let severity: 'high' | 'medium' | 'low' = 'low';
    let message = '';
    let recommendation = '';
    let timeOverlap = false;
    let sameVenue = false;
    let canReschedule = true;

    // Check for time overlaps
    if (booking.eventTime) {
      const bookingTime = booking.eventTime;
      timeOverlap = conflicts.some(c => c.eventTime === bookingTime);
    }

    // Check for same venue conflicts
    if (booking.venue) {
      sameVenue = conflicts.some(c => c.venue === booking.venue);
    }

    // Determine severity
    if (confirmedActualBookings.length > 0) {
      severity = 'high';
      message = `Double booking detected! You already have ${confirmedActualBookings.length} confirmed booking(s) on this date.`;
      recommendation = 'Consider rescheduling one of the events or declining this booking.';
      canReschedule = false;
    } else if (confirmedBookings.length > 0) {
      severity = 'medium';
      message = `Potential conflict: ${confirmedBookings.length} confirmed booking(s) already exist for this date.`;
      recommendation = 'Review timing and venue details to ensure no conflicts.';
    } else {
      severity = 'low';
      message = `${conflicts.length} pending booking(s) exist for this date.`;
      recommendation = 'Monitor for potential conflicts as bookings are confirmed.';
    }

    if (timeOverlap) {
      severity = severity === 'high' ? 'high' : 'medium';
      message += ' Time slots overlap.';
    }

    if (sameVenue) {
      severity = severity === 'high' ? 'high' : 'medium';
      message += ' Same venue detected.';
    }

    return {
      severity,
      message,
      recommendation,
      timeOverlap,
      sameVenue,
      canReschedule
    };
  }

  async saveConflict(userId: string, bookingId: number, conflict: ConflictInfo, analysis: ConflictAnalysis): Promise<void> {
    // Save conflict to database for tracking
    const conflictData = {
      userId,
      enquiryId: bookingId,
      conflictType: conflict.type,
      conflictId: conflict.id,
      severity: analysis.severity,
      message: analysis.message,
      resolved: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.storage.createBookingConflict(conflictData);
  }
}