import { IStorage } from './storage';
import { Enquiry, Booking } from '@shared/schema';

export interface ConflictInfo {
  id: number;
  type: 'enquiry' | 'booking';
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

  async checkEnquiryConflicts(enquiry: Enquiry, userId: string): Promise<{
    conflicts: ConflictInfo[];
    analysis: ConflictAnalysis | null;
  }> {
    if (!enquiry.eventDate) {
      return { conflicts: [], analysis: null };
    }

    // Get all bookings and other enquiries for the same date
    const [bookings, enquiries] = await Promise.all([
      this.storage.getBookings(userId),
      this.storage.getEnquiries(userId)
    ]);

    const conflicts: ConflictInfo[] = [];
    const enquiryDate = new Date(enquiry.eventDate);

    // Check for booking conflicts
    for (const booking of bookings) {
      if (this.isSameDay(new Date(booking.eventDate), enquiryDate)) {
        conflicts.push({
          id: booking.id,
          type: 'booking',
          title: booking.title,
          clientName: booking.clientName,
          eventDate: new Date(booking.eventDate),
          eventTime: booking.eventTime,
          venue: booking.venue,
          status: booking.status
        });
      }
    }

    // Check for enquiry conflicts (excluding the current enquiry)
    for (const otherEnquiry of enquiries) {
      if (otherEnquiry.id !== enquiry.id && otherEnquiry.eventDate) {
        if (this.isSameDay(new Date(otherEnquiry.eventDate), enquiryDate)) {
          conflicts.push({
            id: otherEnquiry.id,
            type: 'enquiry',
            title: otherEnquiry.title,
            clientName: otherEnquiry.clientName,
            eventDate: new Date(otherEnquiry.eventDate),
            eventTime: otherEnquiry.eventTime,
            venue: otherEnquiry.venue,
            status: otherEnquiry.status
          });
        }
      }
    }

    const analysis = conflicts.length > 0 ? this.analyzeConflicts(enquiry, conflicts) : null;

    return { conflicts, analysis };
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private analyzeConflicts(enquiry: Enquiry, conflicts: ConflictInfo[]): ConflictAnalysis {
    const confirmedBookings = conflicts.filter(c => c.type === 'booking' && c.status === 'confirmed');
    const confirmedEnquiries = conflicts.filter(c => c.type === 'enquiry' && c.status === 'confirmed');
    
    let severity: 'high' | 'medium' | 'low' = 'low';
    let message = '';
    let recommendation = '';
    let timeOverlap = false;
    let sameVenue = false;
    let canReschedule = true;

    // Check for time overlaps
    if (enquiry.eventTime) {
      const enquiryTime = enquiry.eventTime;
      timeOverlap = conflicts.some(c => c.eventTime === enquiryTime);
    }

    // Check for same venue conflicts
    if (enquiry.venue) {
      sameVenue = conflicts.some(c => c.venue === enquiry.venue);
    }

    // Determine severity
    if (confirmedBookings.length > 0) {
      severity = 'high';
      message = `Double booking detected! You already have ${confirmedBookings.length} confirmed booking(s) on this date.`;
      recommendation = 'Consider rescheduling one of the events or declining this enquiry.';
      canReschedule = false;
    } else if (confirmedEnquiries.length > 0) {
      severity = 'medium';
      message = `Potential conflict: ${confirmedEnquiries.length} confirmed enquiry/enquiries already exist for this date.`;
      recommendation = 'Review timing and venue details to ensure no conflicts.';
    } else {
      severity = 'low';
      message = `${conflicts.length} pending enquiry/enquiries exist for this date.`;
      recommendation = 'Monitor for potential conflicts as enquiries are confirmed.';
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

  async saveConflict(userId: string, enquiryId: number, conflict: ConflictInfo, analysis: ConflictAnalysis): Promise<void> {
    // Save conflict to database for tracking
    const conflictData = {
      userId,
      enquiryId,
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