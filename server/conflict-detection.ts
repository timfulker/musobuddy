/**
 * Booking Conflict Detection Service
 * Detects conflicts between enquiries, contracts, and bookings
 * Includes travel time and distance calculations
 */

import { IStorage } from "./storage";
import { Enquiry, Contract, Booking, UserSettings, BookingConflict } from "../shared/schema";

export interface ConflictInfo {
  id: number;
  type: 'enquiry' | 'contract' | 'booking';
  title: string;
  clientName: string;
  eventDate: Date;
  eventTime: string;
  eventEndTime?: string;
  performanceDuration?: number; // minutes
  venue: string;
  status: string;
}

export interface ConflictAnalysis {
  severity: 'critical' | 'warning' | 'manageable';
  travelTime: number | null; // minutes
  distance: number | null; // miles
  timeGap: number | null; // minutes
  reason: string;
  recommendations: string[];
}

export class ConflictDetectionService {
  constructor(private storage: IStorage) {}

  /**
   * Check for conflicts when creating a new enquiry
   */
  async checkEnquiryConflicts(
    newEnquiry: Enquiry,
    userId: string
  ): Promise<{ conflicts: ConflictInfo[]; analysis: ConflictAnalysis | null }> {
    if (!newEnquiry.eventDate) {
      return { conflicts: [], analysis: null };
    }

    // Get existing bookings for the same date
    const existingBookings = await this.getBookingsForDate(newEnquiry.eventDate, userId);
    
    if (existingBookings.length === 0) {
      return { conflicts: [], analysis: null };
    }

    // Get user settings for buffer times and travel preferences
    const userSettings = await this.storage.getUserSettings(userId);
    
    // Analyze each conflict
    const conflicts: ConflictInfo[] = existingBookings;
    const analysis = await this.analyzeConflict(newEnquiry, existingBookings[0], userSettings);

    return { conflicts, analysis };
  }

  /**
   * Get all bookings (enquiries, contracts, bookings) for a specific date
   */
  private async getBookingsForDate(eventDate: Date, userId: string): Promise<ConflictInfo[]> {
    const bookings: ConflictInfo[] = [];
    const targetDate = new Date(eventDate);
    targetDate.setHours(0, 0, 0, 0);
    
    // Get enquiries with the same date
    const enquiries = await this.storage.getEnquiries(userId);
    enquiries.forEach(enquiry => {
      if (enquiry.eventDate) {
        const enquiryDate = new Date(enquiry.eventDate);
        enquiryDate.setHours(0, 0, 0, 0);
        if (enquiryDate.getTime() === targetDate.getTime()) {
          bookings.push({
            id: enquiry.id,
            type: 'enquiry',
            title: enquiry.title,
            clientName: enquiry.clientName,
            eventDate: enquiry.eventDate,
            eventTime: enquiry.eventTime || 'TBC',
            eventEndTime: enquiry.eventEndTime,
            performanceDuration: enquiry.performanceDuration,
            venue: enquiry.venue || 'TBC',
            status: enquiry.status
          });
        }
      }
    });

    // Get contracts with the same date
    const contracts = await this.storage.getContracts(userId);
    contracts.forEach(contract => {
      const contractDate = new Date(contract.eventDate);
      contractDate.setHours(0, 0, 0, 0);
      if (contractDate.getTime() === targetDate.getTime()) {
        bookings.push({
          id: contract.id,
          type: 'contract',
          title: `${contract.clientName} Performance`,
          clientName: contract.clientName,
          eventDate: contract.eventDate,
          eventTime: contract.eventTime,
          eventEndTime: contract.eventEndTime,
          performanceDuration: contract.performanceDuration,
          venue: contract.venue,
          status: contract.status
        });
      }
    });

    // Get confirmed bookings with the same date
    const confirmedBookings = await this.storage.getBookings(userId);
    confirmedBookings.forEach(booking => {
      const bookingDate = new Date(booking.eventDate);
      bookingDate.setHours(0, 0, 0, 0);
      if (bookingDate.getTime() === targetDate.getTime()) {
        bookings.push({
          id: booking.id,
          type: 'booking',
          title: booking.title,
          clientName: booking.clientName,
          eventDate: booking.eventDate,
          eventTime: booking.eventTime,
          eventEndTime: booking.eventEndTime,
          performanceDuration: booking.performanceDuration,
          venue: booking.venue,
          status: booking.status
        });
      }
    });

    return bookings;
  }

  /**
   * Analyze conflict severity and provide recommendations
   */
  private async analyzeConflict(
    newEnquiry: Enquiry,
    conflictingBooking: ConflictInfo,
    userSettings: UserSettings | null
  ): Promise<ConflictAnalysis> {
    const analysis: ConflictAnalysis = {
      severity: 'manageable',
      travelTime: null,
      distance: null,
      timeGap: null,
      reason: '',
      recommendations: []
    };

    // Calculate time gap if both have times
    if (newEnquiry.eventTime && conflictingBooking.eventTime && 
        newEnquiry.eventTime !== 'TBC' && conflictingBooking.eventTime !== 'TBC') {
      const timeGap = this.calculateTimeGap(newEnquiry, conflictingBooking);
      analysis.timeGap = timeGap;

      // Calculate travel time if both have venues
      if (newEnquiry.venue && conflictingBooking.venue) {
        const { travelTime, distance } = await this.calculateTravelTime(
          newEnquiry.venue,
          conflictingBooking.venue
        );
        analysis.travelTime = travelTime;
        analysis.distance = distance;
      }
    }

    // Determine severity based on analysis
    analysis.severity = this.determineSeverity(analysis, userSettings);
    analysis.reason = this.generateReason(analysis);
    analysis.recommendations = this.generateRecommendations(analysis, userSettings);

    return analysis;
  }

  /**
   * Calculate time gap between two events considering start/end times and durations
   */
  private calculateTimeGap(newEnquiry: Enquiry, conflictingBooking: ConflictInfo): number {
    const parseTime = (timeStr: string): number => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = hours * 60 + (minutes || 0);
      
      if (period?.toLowerCase() === 'pm' && hours !== 12) {
        totalMinutes += 12 * 60;
      } else if (period?.toLowerCase() === 'am' && hours === 12) {
        totalMinutes -= 12 * 60;
      }
      
      return totalMinutes;
    };

    const calculateEndTime = (startTime: string, endTime?: string, duration?: number): number => {
      if (endTime) {
        return parseTime(endTime);
      }
      if (duration) {
        return parseTime(startTime) + duration;
      }
      // Default 2-hour performance if no end time or duration
      return parseTime(startTime) + 120;
    };

    const newStart = parseTime(newEnquiry.eventTime!);
    const newEnd = calculateEndTime(newEnquiry.eventTime!, newEnquiry.eventEndTime, newEnquiry.performanceDuration);
    
    const conflictStart = parseTime(conflictingBooking.eventTime);
    const conflictEnd = calculateEndTime(conflictingBooking.eventTime, conflictingBooking.eventEndTime, conflictingBooking.performanceDuration);

    // Check for overlapping times
    const overlap = Math.max(0, Math.min(newEnd, conflictEnd) - Math.max(newStart, conflictStart));
    
    if (overlap > 0) {
      return -overlap; // Negative indicates overlap
    }

    // Calculate gap between non-overlapping events
    if (newEnd <= conflictStart) {
      return conflictStart - newEnd; // Gap from new event end to conflict start
    } else {
      return newStart - conflictEnd; // Gap from conflict end to new event start
    }
  }

  /**
   * Calculate travel time between two venues using UK postcode/address
   */
  private async calculateTravelTime(
    venue1: string,
    venue2: string
  ): Promise<{ travelTime: number | null; distance: number | null }> {
    // For now, implement basic distance estimation
    // In production, you'd use Google Maps API or similar
    
    // Simple heuristic: if venues are the same, no travel time
    if (venue1.toLowerCase() === venue2.toLowerCase()) {
      return { travelTime: 0, distance: 0 };
    }

    // Extract postcodes if present
    const postcode1 = this.extractPostcode(venue1);
    const postcode2 = this.extractPostcode(venue2);

    if (postcode1 && postcode2) {
      // Estimate based on postcode areas
      const distance = this.estimateDistanceFromPostcodes(postcode1, postcode2);
      const travelTime = Math.max(30, distance * 2); // Rough estimate: 30 mins minimum, 2 mins per mile
      return { travelTime, distance };
    }

    // Default estimation for unknown venues
    return { travelTime: 60, distance: 20 }; // 1 hour, 20 miles default
  }

  /**
   * Extract postcode from venue string
   */
  private extractPostcode(venue: string): string | null {
    // UK postcode regex pattern
    const postcodeRegex = /([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})/gi;
    const match = venue.match(postcodeRegex);
    return match ? match[0] : null;
  }

  /**
   * Estimate distance between UK postcodes
   */
  private estimateDistanceFromPostcodes(postcode1: string, postcode2: string): number {
    // Simple estimation based on first part of postcode
    const area1 = postcode1.replace(/\s/g, '').substring(0, 2);
    const area2 = postcode2.replace(/\s/g, '').substring(0, 2);

    if (area1 === area2) {
      return 5; // Same area, ~5 miles
    }

    // London postcodes
    const londonAreas = ['E1', 'E2', 'E3', 'E4', 'EC', 'N1', 'N2', 'N3', 'N4', 'NW', 'SE', 'SW', 'W1', 'W2', 'WC'];
    const isLondon1 = londonAreas.some(area => area1.startsWith(area));
    const isLondon2 = londonAreas.some(area => area2.startsWith(area));

    if (isLondon1 && isLondon2) {
      return 15; // Both in London, ~15 miles
    }

    if (isLondon1 || isLondon2) {
      return 50; // One in London, one outside, ~50 miles
    }

    // Different areas outside London
    return 75; // Different areas, ~75 miles
  }

  /**
   * Determine conflict severity based on analysis
   */
  private determineSeverity(
    analysis: ConflictAnalysis,
    userSettings: UserSettings | null
  ): 'critical' | 'warning' | 'manageable' {
    // Critical: Overlapping performances
    if (analysis.timeGap !== null && analysis.timeGap < 0) {
      return 'critical';
    }

    if (analysis.timeGap === null || analysis.travelTime === null) {
      return 'warning'; // Unknown times/venues
    }

    const bufferTime = userSettings?.defaultBufferTime || 90;
    const maxDistance = userSettings?.maxTravelDistance || 100;

    // Critical: Not enough time to travel between venues
    if (analysis.travelTime && analysis.timeGap < analysis.travelTime + bufferTime) {
      return 'critical';
    }

    // Critical: Distance too far
    if (analysis.distance && analysis.distance > maxDistance) {
      return 'critical';
    }

    // Warning: Tight schedule
    if (analysis.timeGap < bufferTime * 2) {
      return 'warning';
    }

    return 'manageable';
  }

  /**
   * Generate human-readable reason for conflict
   */
  private generateReason(analysis: ConflictAnalysis): string {
    if (analysis.timeGap === null) {
      return 'Time conflict detected - times not specified';
    }

    if (analysis.timeGap < 0) {
      const overlapMinutes = Math.abs(analysis.timeGap);
      const hours = Math.floor(overlapMinutes / 60);
      const minutes = overlapMinutes % 60;
      const overlapStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      return `Performances overlap by ${overlapStr} - direct scheduling conflict`;
    }

    if (analysis.travelTime === null) {
      return 'Same date booking - travel time unknown';
    }

    const hours = Math.floor(analysis.timeGap / 60);
    const minutes = analysis.timeGap % 60;
    const timeGapStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return `${timeGapStr} between bookings, ${analysis.travelTime}m travel time required`;
  }

  /**
   * Generate recommendations based on conflict analysis
   */
  private generateRecommendations(
    analysis: ConflictAnalysis,
    userSettings: UserSettings | null
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.timeGap !== null && analysis.timeGap < 0) {
      recommendations.push('Performances overlap - cannot accept both');
      recommendations.push('Decline new enquiry or cancel existing booking');
      recommendations.push('Offer alternative dates to new client');
      return recommendations;
    }

    if (analysis.severity === 'critical') {
      recommendations.push('Consider declining this enquiry');
      recommendations.push('Request alternative dates from client');
      if (analysis.travelTime && analysis.timeGap !== null && analysis.timeGap < analysis.travelTime + 90) {
        recommendations.push('Insufficient time for travel between venues');
      }
    } else if (analysis.severity === 'warning') {
      recommendations.push('Verify exact timings with both clients');
      recommendations.push('Plan travel route and buffer time');
      recommendations.push('Consider charging travel time/costs');
      recommendations.push('Confirm setup/breakdown times');
    } else {
      recommendations.push('Manageable with proper planning');
      recommendations.push('Confirm timings with both clients');
    }

    if (analysis.distance && analysis.distance > 30) {
      recommendations.push('Consider charging travel expenses');
    }

    return recommendations;
  }

  /**
   * Save conflict to database for tracking
   */
  async saveConflict(
    userId: string,
    enquiryId: number,
    conflictingBooking: ConflictInfo,
    analysis: ConflictAnalysis
  ): Promise<void> {
    const conflict = {
      userId,
      enquiryId,
      conflictingId: conflictingBooking.id,
      conflictType: conflictingBooking.type,
      conflictDate: conflictingBooking.eventDate,
      severity: analysis.severity,
      travelTime: analysis.travelTime,
      distance: analysis.distance ? parseFloat(analysis.distance.toString()) : null,
      timeGap: analysis.timeGap,
      isResolved: false,
      resolution: null,
      notes: analysis.reason
    };

    await this.storage.createBookingConflict(conflict);
  }

  /**
   * Get unresolved conflicts for user
   */
  async getUnresolvedConflicts(userId: string): Promise<BookingConflict[]> {
    return await this.storage.getUnresolvedConflicts(userId);
  }

  /**
   * Resolve conflict with decision
   */
  async resolveConflict(
    conflictId: number,
    resolution: 'accepted_both' | 'declined_new' | 'rescheduled',
    notes?: string
  ): Promise<void> {
    await this.storage.resolveConflict(conflictId, resolution, notes);
  }
}