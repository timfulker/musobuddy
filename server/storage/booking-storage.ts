import { db } from "../core/database";
import { bookings, bookingConflicts, bookingDocuments, invoices } from "../../shared/schema";
import type { InsertBookingDocument, BookingDocument } from "../../shared/document-schemas";
import { eq, and, desc, or, sql, gte, lte, notInArray, inArray } from "drizzle-orm";
import { SupabaseBookingStorage } from "./supabase-booking-storage";

export class BookingStorage {
  private db = db;
  private supabaseStorage: SupabaseBookingStorage;

  constructor() {
    this.supabaseStorage = new SupabaseBookingStorage();
  }

  // ===== BOOKING METHODS =====
  
  async getBooking(id: number) {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    const booking = result[0] || null;
    
    if (!booking) return null;
    

    // Convert date strings to Date objects and apply field mapping (same as getBookingsByUser)
    return {
      ...booking,
      // Map critical fields for invoice generation
      performanceDuration: (booking as any).performance_duration || booking.performanceDuration,
      gigType: (booking as any).gig_type || booking.gigType,
      venueAddress: (booking as any).venue_address || booking.venueAddress,
      applyNowLink: (booking as any).apply_now_link || booking.applyNowLink,
      venueContact: (booking as any).venue_contact || booking.venueContact,
      soundTechContact: (booking as any).sound_tech_contact || booking.soundTechContact,
      soundCheckTime: (booking as any).sound_check_time || booking.soundCheckTime,
      stageSize: (booking as any).stage_size || booking.stageSize,
      powerEquipment: (booking as any).power_equipment || booking.powerEquipment,
      styleMood: (booking as any).style_mood || booking.styleMood,
      mustPlaySongs: (booking as any).must_play_songs || booking.mustPlaySongs,
      avoidSongs: (booking as any).avoid_songs || booking.avoidSongs,
      setOrder: (booking as any).set_order || booking.setOrder,
      firstDanceSong: (booking as any).first_dance_song || booking.firstDanceSong,
      processionalSong: (booking as any).processional_song || booking.processionalSong,
      signingRegisterSong: (booking as any).signing_register_song || booking.signingRegisterSong,
      recessionalSong: (booking as any).recessional_song || booking.recessionalSong,
      specialDedications: (booking as any).special_dedications || booking.specialDedications,
      guestAnnouncements: (booking as any).guest_announcements || booking.guestAnnouncements,
      loadInInfo: (booking as any).load_in_info || booking.loadInInfo,
      weatherContingency: (booking as any).weather_contingency || booking.weatherContingency,
      parkingPermitRequired: (booking as any).parking_permit_required || booking.parkingPermitRequired,
      mealProvided: (booking as any).meal_provided || booking.mealProvided,
      dietaryRequirements: (booking as any).dietary_requirements || booking.dietaryRequirements,
      sharedNotes: (booking as any).shared_notes || booking.sharedNotes,
      referenceTracks: (booking as any).reference_tracks || booking.referenceTracks,
      photoPermission: (booking as any).photo_permission || booking.photoPermission,
      encoreAllowed: (booking as any).encore_allowed || booking.encoreAllowed,
      encoreSuggestions: (booking as any).encore_suggestions || booking.encoreSuggestions,
      eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
      updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
    };
  }

  async getBookingByIdAndUser(id: number, userId: string) {
    const result = await db.select().from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)));
    const booking = result[0] || null;
    
    if (!booking) return null;
    
    // Apply the same field mapping as getBooking for consistency
    return {
      ...booking,
      // Map snake_case database fields to camelCase
      performanceDuration: (booking as any).performance_duration || booking.performanceDuration,
      gigType: (booking as any).gig_type || booking.gigType,
      venueAddress: (booking as any).venue_address || booking.venueAddress,
      applyNowLink: (booking as any).apply_now_link || booking.applyNowLink,
      venueContact: (booking as any).venue_contact || booking.venueContact,
      soundTechContact: (booking as any).sound_tech_contact || booking.soundTechContact,
      soundCheckTime: (booking as any).sound_check_time || booking.soundCheckTime,
      stageSize: (booking as any).stage_size || booking.stageSize,
      powerEquipment: (booking as any).power_equipment || booking.powerEquipment,
      styleMood: (booking as any).style_mood || booking.styleMood,
      mustPlaySongs: (booking as any).must_play_songs || booking.mustPlaySongs,
      avoidSongs: (booking as any).avoid_songs || booking.avoidSongs,
      setOrder: (booking as any).set_order || booking.setOrder,
      firstDanceSong: (booking as any).first_dance_song || booking.firstDanceSong,
      processionalSong: (booking as any).processional_song || booking.processionalSong,
      signingRegisterSong: (booking as any).signing_register_song || booking.signingRegisterSong,
      recessionalSong: (booking as any).recessional_song || booking.recessionalSong,
      specialDedications: (booking as any).special_dedications || booking.specialDedications,
      guestAnnouncements: (booking as any).guest_announcements || booking.guestAnnouncements,
      loadInInfo: (booking as any).load_in_info || booking.loadInInfo,
      weatherContingency: (booking as any).weather_contingency || booking.weatherContingency,
      parkingPermitRequired: (booking as any).parking_permit_required || booking.parkingPermitRequired,
      mealProvided: (booking as any).meal_provided || booking.mealProvided,
      dietaryRequirements: (booking as any).dietary_requirements || booking.dietaryRequirements,
      sharedNotes: (booking as any).shared_notes || booking.sharedNotes,
      referenceTracks: (booking as any).reference_tracks || booking.referenceTracks,
      photoPermission: (booking as any).photo_permission || booking.photoPermission,
      encoreAllowed: (booking as any).encore_allowed || booking.encoreAllowed,
      encoreSuggestions: (booking as any).encore_suggestions || booking.encoreSuggestions,
      eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
      updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
    };
  }

  async getBookingsByUser(userId: string) {
    // Check if we should use Supabase
    if (this.supabaseStorage.isSupabaseEnabled() &&
        this.supabaseStorage.getMigrationMode() === 'supabase-primary') {
      console.log('🚀 Using Supabase for fetching bookings');
      return await this.supabaseStorage.getBookings(userId);
    }

    // Otherwise use Firebase/Drizzle
    const results = await db.select().from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
    
    // Convert date strings to Date objects for timestamp fields
    // Also ensure proper field mapping from snake_case to camelCase
    return results.map(booking => ({
      ...booking,
      // Map critical fields for invoice generation
      performanceDuration: (booking as any).performance_duration || booking.performanceDuration,
      gigType: (booking as any).gig_type || booking.gigType,
      // Explicitly map snake_case fields to camelCase for frontend compatibility
      venueAddress: (booking as any).venue_address || booking.venueAddress,
      applyNowLink: (booking as any).apply_now_link || booking.applyNowLink,
      // Collaborative form fields mapping
      venueContact: (booking as any).venue_contact || booking.venueContact,
      soundTechContact: (booking as any).sound_tech_contact || booking.soundTechContact,
      soundCheckTime: (booking as any).sound_check_time || booking.soundCheckTime,
      stageSize: (booking as any).stage_size || booking.stageSize,
      powerEquipment: (booking as any).power_equipment || booking.powerEquipment,
      styleMood: (booking as any).style_mood || booking.styleMood,
      mustPlaySongs: (booking as any).must_play_songs || booking.mustPlaySongs,
      avoidSongs: (booking as any).avoid_songs || booking.avoidSongs,
      setOrder: (booking as any).set_order || booking.setOrder,
      firstDanceSong: (booking as any).first_dance_song || booking.firstDanceSong,
      processionalSong: (booking as any).processional_song || booking.processionalSong,
      signingRegisterSong: (booking as any).signing_register_song || booking.signingRegisterSong,
      recessionalSong: (booking as any).recessional_song || booking.recessionalSong,
      specialDedications: (booking as any).special_dedications || booking.specialDedications,
      guestAnnouncements: (booking as any).guest_announcements || booking.guestAnnouncements,
      loadInInfo: (booking as any).load_in_info || booking.loadInInfo,
      weatherContingency: (booking as any).weather_contingency || booking.weatherContingency,
      parkingPermitRequired: (booking as any).parking_permit_required || booking.parkingPermitRequired,
      mealProvided: (booking as any).meal_provided || booking.mealProvided,
      dietaryRequirements: (booking as any).dietary_requirements || booking.dietaryRequirements,
      sharedNotes: (booking as any).shared_notes || booking.sharedNotes,
      referenceTracks: (booking as any).reference_tracks || booking.referenceTracks,
      photoPermission: (booking as any).photo_permission || booking.photoPermission,
      encoreAllowed: (booking as any).encore_allowed || booking.encoreAllowed,
      encoreSuggestions: (booking as any).encore_suggestions || booking.encoreSuggestions,
      eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
      updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
    }));
  }

  async createBooking(data: any) {
    // Check if we should use Supabase
    if (this.supabaseStorage.isSupabaseEnabled() &&
        this.supabaseStorage.getMigrationMode() === 'supabase-primary') {
      console.log('🚀 Using Supabase for booking creation');
      return await this.supabaseStorage.createBooking(data);
    }

    // Otherwise use Firebase/Drizzle
    console.log('📦 Using Firebase for booking creation');

    // Remove undefined values to prevent database errors, but ensure title is always present
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    // Ensure title is always present
    if (!cleanData.title) {
      cleanData.title = 'Booking Request';
    }

    // Apply the same sanitization to create operations
    const sanitizeNumericFields = (data: any) => {
      const numericFields = [
        'fee', 'deposit', 'setupTime', 'soundCheckTime', 'packupTime', 
        'travelTime', 'mileage', 'distanceInMiles', 'distanceInKm',
        'quotedAmount', 'travelExpense', 'depositAmount', 'finalAmount'
      ];
      
      const sanitized = { ...data };
      numericFields.forEach(field => {
        if (sanitized[field] === '' || sanitized[field] === undefined) {
          sanitized[field] = null;
        } else if (sanitized[field] !== null) {
          const originalValue = sanitized[field];
          // Strip all currency symbols, commas, and extra whitespace
          const cleanValue = String(sanitized[field])
            .replace(/[£$€¥₹₽¢₦₨₩₪₡₴₵₸₺₻₼₽₾₿]/g, '') // Currency symbols
            .replace(/[,\s]/g, '') // Commas and whitespace
            .trim();
          
          if (cleanValue && !isNaN(Number(cleanValue))) {
            sanitized[field] = Number(cleanValue);
          } else if (!cleanValue) {
            sanitized[field] = null;
          }
        }
      });
      
      return sanitized;
    };

    const sanitizedData = sanitizeNumericFields(cleanData);

    const result = await db.insert(bookings).values({
      ...sanitizedData,
      eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
    }).returning();
    return result[0];
  }

  async updateBooking(id: number, updates: any, userId: string) {
    // Check if we should use Supabase
    if (this.supabaseStorage.isSupabaseEnabled() &&
        this.supabaseStorage.getMigrationMode() === 'supabase-primary') {
      console.log('🚀 Using Supabase for updating booking');
      return await this.supabaseStorage.updateBooking(id, updates, userId);
    }

    // Otherwise use Firebase/Drizzle
    // Get current booking to access existing documents
    const currentBooking = await this.getBooking(id);
    if (!currentBooking) {
      throw new Error('Booking not found');
    }

    // Sanitize numeric fields - convert empty strings to null and strip currency symbols
    const sanitizeNumericFields = (data: any) => {
      const numericFields = [
        'fee', 'deposit', 'setupTime', 'soundCheckTime', 'packupTime', 
        'travelTime', 'mileage', 'distanceInMiles', 'distanceInKm',
        'quotedAmount', 'travelExpense', 'depositAmount', 'finalAmount'
      ];
      
      const sanitized = { ...data };
      numericFields.forEach(field => {
        // Only process fields that are actually present in the update data
        if (!(field in data)) {
          return; // Skip fields not being updated
        }
        
        if (sanitized[field] === '' || sanitized[field] === undefined) {
          sanitized[field] = null;
        } else if (sanitized[field] !== null) {
          const originalValue = sanitized[field];
          // Strip all currency symbols, commas, and extra whitespace
          const cleanValue = String(sanitized[field])
            .replace(/[£$€¥₹₽¢₦₨₩₪₡₴₵₸₺₻₼₽₾₿]/g, '') // Currency symbols
            .replace(/[,\s]/g, '') // Commas and whitespace
            .trim();
          
          console.log(`🔧 Sanitizing ${field}: "${originalValue}" → "${cleanValue}"`);
          
          if (cleanValue && !isNaN(Number(cleanValue))) {
            sanitized[field] = Number(cleanValue);
          } else if (!cleanValue) {
            sanitized[field] = null;
          } else {
            console.warn(`⚠️ Could not sanitize ${field}: "${originalValue}"`);
            sanitized[field] = null;
          }
        }
      });
      
      return sanitized;
    };


    const sanitizedUpdates = sanitizeNumericFields(updates);

    const setData = {
      ...sanitizedUpdates,
      eventDate: sanitizedUpdates.eventDate ? new Date(sanitizedUpdates.eventDate) : undefined,
      updatedAt: new Date(),
    };

    console.log(`🔍 [ADMIN] Updating booking #${id} for userId ${userId}`);
    console.log(`🔍 [ADMIN] Update data:`, JSON.stringify(setData, null, 2));
    
    const result = await db.update(bookings)
      .set(setData)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    
    console.log(`🔍 [ADMIN] Database update result:`, result.length > 0 ? 'SUCCESS' : 'NO ROWS UPDATED');
    console.log(`🔍 [ADMIN] Updated booking data:`, result[0] ? {
      id: result[0].id,
      clientName: result[0].clientName,
      clientEmail: result[0].clientEmail,
      eventDate: result[0].eventDate,
      venue: result[0].venue
    } : 'No data returned');
    
    return result[0];
  }

  async deleteBooking(id: number, userId: string) {
    // Check if we should use Supabase
    if (this.supabaseStorage.isSupabaseEnabled() &&
        this.supabaseStorage.getMigrationMode() === 'supabase-primary') {
      console.log('🚀 Using Supabase for deleting booking');
      return await this.supabaseStorage.deleteBooking(id, userId);
    }

    // Otherwise use Firebase/Drizzle
    // First, set bookingId to null for any related invoices to avoid foreign key constraint error
    await db.update(invoices)
      .set({ bookingId: null })
      .where(eq(invoices.bookingId, id));
    
    // Now delete the booking
    const result = await db.delete(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    return result[0];
  }

  // ===== BOOKING STATISTICS =====
  
  async getBookingStats(userId: string) {
    const result = await db.select({
      total: sql<number>`count(*)`,
      new: sql<number>`count(case when status = 'new' then 1 end)`,
      inProgress: sql<number>`count(case when status = 'in_progress' then 1 end)`,
      confirmed: sql<number>`count(case when status = 'confirmed' then 1 end)`,
      completed: sql<number>`count(case when status = 'completed' then 1 end)`,
      totalValue: sql<number>`sum(fee)`,
    })
    .from(bookings)
    .where(eq(bookings.userId, userId));
    
    return result[0] || { 
      total: 0, 
      new: 0, 
      inProgress: 0, 
      confirmed: 0,
      completed: 0,
      totalValue: 0
    };
  }

  async getRecentBookings(userId: string, limit: number = 5) {
    const results = await db.select().from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt))
      .limit(limit);
    
    return results.map(booking => ({
      ...booking,
      eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
      updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
    }));
  }

  async getBookingsByStatus(userId: string, status: string) {
    const results = await db.select().from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        eq(bookings.status, status)
      ))
      .orderBy(desc(bookings.eventDate));
    
    return results.map(booking => ({
      ...booking,
      eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
      updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
    }));
  }

  async getUpcomingBookings(userId: string) {
    const today = new Date();
    const results = await db.select().from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        gte(bookings.eventDate, today)
      ))
      .orderBy(bookings.eventDate);
    
    return results.map(booking => ({
      ...booking,
      eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
      updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
    }));
  }

  // Batch fetch multiple bookings by IDs - optimized single query
  async getBookingsByIds(bookingIds: number[], userId: string) {
    if (!bookingIds || bookingIds.length === 0) {
      return [];
    }
    
    const results = await db.select().from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        sql`${bookings.id} = ANY(${bookingIds})`
      ));
    
    return results.map(booking => ({
      ...booking,
      eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
      updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
    }));
  }

  async getBookingsByDateRange(userId: string, startDate: Date, endDate: Date) {
    const results = await db.select().from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        gte(bookings.eventDate, startDate),
        lte(bookings.eventDate, endDate)
      ))
      .orderBy(bookings.eventDate);
    
    return results.map(booking => ({
      ...booking,
      eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
      updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
    }));
  }

  // ===== CONFLICT DETECTION METHODS =====
  
  async checkBookingConflicts(userId: string, eventDate: Date, eventTime: string, eventEndTime: string, excludeId?: number) {
    const conditions = [
      eq(bookings.userId, userId),
      eq(bookings.eventDate, eventDate),
      or(
        eq(bookings.status, 'confirmed'),
        eq(bookings.status, 'in_progress')
      )
    ];

    if (excludeId) {
      conditions.push(sql`${bookings.id} != ${excludeId}`);
    }

    const conflictingBookings = await db.select().from(bookings)
      .where(and(...conditions));

    return conflictingBookings.filter(booking => {
      if (!booking.eventTime || !booking.eventEndTime) return false;
      
      const newStart = new Date(`${eventDate.toISOString().split('T')[0]}T${eventTime}`);
      const newEnd = new Date(`${eventDate.toISOString().split('T')[0]}T${eventEndTime}`);
      const existingStart = new Date(`${eventDate.toISOString().split('T')[0]}T${booking.eventTime}`);
      const existingEnd = new Date(`${eventDate.toISOString().split('T')[0]}T${booking.eventEndTime}`);
      
      return (newStart < existingEnd && newEnd > existingStart);
    });
  }

  async createBookingConflict(data: {
    userId: string;
    enquiryId: number;
    conflictingId: number;
    conflictType: string;
    conflictDate: Date;
    severity: string;
    travelTime?: number;
    distance?: number;
    timeGap?: number;
    notes?: string;
  }) {
    const conflictData = {
      userId: data.userId,
      enquiryId: data.enquiryId,
      conflictingId: data.conflictingId,
      conflictType: data.conflictType,
      conflictDate: data.conflictDate,
      severity: data.severity,
      ...(data.travelTime !== undefined && { travelTime: data.travelTime }),
      ...(data.distance !== undefined && { distance: data.distance.toString() }),
      ...(data.timeGap !== undefined && { timeGap: data.timeGap }),
      ...(data.notes !== undefined && { notes: data.notes }),
    };
    
    const result = await db.insert(bookingConflicts).values([conflictData]).returning();
    return result[0];
  }

  async getBookingConflicts(userId: string, enquiryId: number) {
    return await db.select().from(bookingConflicts)
      .where(and(
        eq(bookingConflicts.userId, userId),
        eq(bookingConflicts.enquiryId, enquiryId)
      ))
      .orderBy(desc(bookingConflicts.createdAt));
  }

  // Get ALL conflicts for a user (for dashboard widget)
  async getAllUserConflicts(userId: string) {
    // Get unresolved booking conflicts from database
    const storedConflicts = await db.select().from(bookingConflicts)
      .where(and(
        eq(bookingConflicts.userId, userId),
        eq(bookingConflicts.isResolved, false)
      ))
      .orderBy(desc(bookingConflicts.createdAt));

    // Also detect real-time conflicts by checking all bookings on same dates
    const allUserBookings = await this.getBookingsByUser(userId);
    
    // Filter to only include active bookings (including new inquiries, but exclude cancelled/rejected/completed)
    const userBookings = allUserBookings.filter(booking => 
      booking.status !== 'rejected' && 
      booking.status !== 'cancelled' && 
      booking.status !== 'completed'
    );
    
    const realTimeConflicts: any[] = [];

    for (let i = 0; i < userBookings.length; i++) {
      const booking1 = userBookings[i];
      if (!booking1.eventDate) continue;

      for (let j = i + 1; j < userBookings.length; j++) {
        const booking2 = userBookings[j];
        if (!booking2.eventDate) continue;

        // Check if bookings are on same date using ISO date comparison
        const date1 = new Date(booking1.eventDate).toDateString();
        const date2 = new Date(booking2.eventDate).toDateString();
        
        if (date1 === date2) {
          let severity = 'soft'; // Default to soft conflict for same day
          let hasTimeOverlap = false;
          
          // If both bookings have complete time info, check for overlap
          if (booking1.eventTime && booking1.eventEndTime && 
              booking2.eventTime && booking2.eventEndTime &&
              booking1.eventTime !== '' && booking1.eventEndTime !== '' &&
              booking2.eventTime !== '' && booking2.eventEndTime !== '') {
            
            try {
              // Helper function to parse time with the booking date
              const parseTimeWithDate = (dateStr: string, timeStr: string): number => {
                const date = new Date(dateStr);
                const [hours, minutes] = timeStr.split(':').map(h => parseInt(h.replace(/[^\d]/g, ''), 10));
                let normalizedHours = hours;
                
                // Handle PM/AM if present
                if (timeStr.toLowerCase().includes('pm') && hours < 12) normalizedHours += 12;
                if (timeStr.toLowerCase().includes('am') && hours === 12) normalizedHours = 0;
                
                date.setHours(normalizedHours, minutes || 0, 0, 0);
                return date.getTime();
              };
              
              const booking1Start = parseTimeWithDate(booking1.eventDate, booking1.eventTime);
              const booking1End = parseTimeWithDate(booking1.eventDate, booking1.eventEndTime);
              const booking2Start = parseTimeWithDate(booking2.eventDate, booking2.eventTime);
              const booking2End = parseTimeWithDate(booking2.eventDate, booking2.eventEndTime);
              
              // Check for time overlap: start1 < end2 && end1 > start2
              hasTimeOverlap = booking1Start < booking2End && booking1End > booking2Start;
              severity = hasTimeOverlap ? 'hard' : 'soft';
              
            } catch (error) {
              console.warn('Error parsing booking times for conflict detection:', error);
              // If time parsing fails, treat as hard conflict for safety
              severity = 'hard';
            }
          } else {
            // If either booking lacks complete time info, it's a hard conflict
            severity = 'hard';
          }
          
          realTimeConflicts.push({
            bookingId: booking1.id,
            withBookingId: booking2.id,
            severity,
            clientName: booking1.clientName || 'Unknown',
            status: booking1.status,
            time: booking1.eventTime || 'Time not specified',
            canEdit: true,
            canReject: true,
            type: hasTimeOverlap ? 'same_time_same_day' : 'same_day',
            message: hasTimeOverlap 
              ? `Time overlap between "${booking1.clientName}" and "${booking2.clientName}"`
              : `Same day booking with "${booking2.clientName}"`,
            date: booking1.eventDate
          });
        }
      }
    }

    return realTimeConflicts;
  }

  async resolveBookingConflict(id: number, resolution: string, notes?: string) {
    const result = await db.update(bookingConflicts)
      .set({
        isResolved: true,
        resolution,
        notes,
        resolvedAt: new Date()
      })
      .where(eq(bookingConflicts.id, id))
      .returning();
    return result[0];
  }

  // ===== ADMIN METHODS =====
  
  async getAllBookings() {
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getAllBookingsCount() {
    const result = await db.select({ count: sql<number>`count(*)` }).from(bookings);
    return result[0]?.count || 0;
  }

  async getTotalBookingCount() {
    return this.getAllBookingsCount();
  }


  // ===== NOTIFICATION COUNT METHODS =====
  
  async getNewBookingsCount(userId: string) {
    // Count ALL bookings with status 'new' (not just last 24 hours)
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        eq(bookings.status, 'new')
      ));
    // Ensure we return a number, not a string
    return parseInt(String(result[0]?.count || 0), 10);
  }

  async getMonthlyRevenue(userId: string): Promise<number> {
    // Get total revenue for current month using SQL date functions
    // Use finalAmount if set, otherwise fee
    const result = await db.select({ 
      total: sql<number>`COALESCE(SUM(CAST(COALESCE(final_amount, fee) AS DECIMAL)), 0)` 
    })
      .from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        sql`DATE_TRUNC('month', ${bookings.eventDate}::date) = DATE_TRUNC('month', CURRENT_DATE)`,
        notInArray(bookings.status, ['cancelled', 'rejected'])
      ));
    
    return Number(result[0]?.total || 0);
  }

  async getActiveBookingsCount(userId: string): Promise<number> {
    // Count bookings that are confirmed and awaiting signature
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        inArray(bookings.status, ['confirmed', 'contract_sent', 'awaiting_signature'])
      ));
    
    return parseInt(String(result[0]?.count || 0), 10);
  }

  // Document Management Methods
  async getBookingDocuments(bookingId: number, userId: string): Promise<BookingDocument[]> {
    return await this.db
      .select()
      .from(bookingDocuments)
      .where(and(
        eq(bookingDocuments.bookingId, bookingId),
        eq(bookingDocuments.userId, userId)
      ))
      .orderBy(desc(bookingDocuments.uploadedAt));
  }

  async addBookingDocument(document: InsertBookingDocument): Promise<BookingDocument> {
    const [inserted] = await this.db
      .insert(bookingDocuments)
      .values(document)
      .returning();
    return inserted;
  }

  async deleteBookingDocument(documentId: number, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(bookingDocuments)
      .where(and(
        eq(bookingDocuments.id, documentId),
        eq(bookingDocuments.userId, userId)
      ));
    return result.rowCount > 0;
  }

  async getBookingDocument(documentId: number, userId: string): Promise<BookingDocument | null> {
    const [document] = await this.db
      .select()
      .from(bookingDocuments)
      .where(and(
        eq(bookingDocuments.id, documentId),
        eq(bookingDocuments.userId, userId)
      ))
      .limit(1);
    return document || null;
  }
}

export const bookingStorage = new BookingStorage();