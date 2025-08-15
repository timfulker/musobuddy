import { db } from "../core/database";
import { bookings, bookingConflicts } from "../../shared/schema";
import { eq, and, desc, or, sql, gte, lte } from "drizzle-orm";

export class BookingStorage {
  private db = db;

  // ===== BOOKING METHODS =====
  
  async getBooking(id: number) {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    const booking = result[0] || null;
    
    if (booking) {
      // Convert date strings to Date objects for timestamp fields
      return {
        ...booking,
        eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
        createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
        updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
      };
    }
    
    return null;
  }

  async getBookingsByUser(userId: string) {
    const results = await db.select().from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
    
    // Convert date strings to Date objects for timestamp fields
    return results.map(booking => ({
      ...booking,
      eventDate: booking.eventDate ? new Date(booking.eventDate) : null,
      createdAt: booking.createdAt ? new Date(booking.createdAt) : null,
      updatedAt: booking.updatedAt ? new Date(booking.updatedAt) : null,
    }));
  }

  async createBooking(data: any) {
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

    const result = await db.update(bookings)
      .set(setData)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    
    return result[0];
  }

  async deleteBooking(id: number, userId: string) {
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
    // Count bookings created in last 24 hours with status 'new'
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(and(
        eq(bookings.userId, userId),
        eq(bookings.status, 'new'),
        gte(bookings.createdAt, oneDayAgo)
      ));
    return result[0]?.count || 0;
  }
}

export const bookingStorage = new BookingStorage();