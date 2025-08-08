import { db } from "../core/database";
import { bookings, bookingConflicts } from "../../shared/schema";
import { eq, and, desc, or, sql, gte, lte } from "drizzle-orm";

interface BookingData {
  userId: string;
  enquiryId?: number;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  venue?: string;
  venueAddress?: string;
  eventDate: Date;
  eventTime?: string;
  eventEndTime?: string;
  gigType?: string;
  fee?: string;
  deposit?: string;
  status?: string;
  notes?: string;
  requirements?: string;
  documents?: any;
  source?: string;
  rawMessage?: string;
}

interface BookingUpdate {
  enquiryId?: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  venue?: string;
  venueAddress?: string;
  eventDate?: Date;
  eventTime?: string;
  eventEndTime?: string;
  gigType?: string;
  fee?: string;
  deposit?: string;
  status?: string;
  notes?: string;
  requirements?: string;
  documents?: any;
  source?: string;
  rawMessage?: string;
}

interface BookingStats {
  total: number;
  new: number;
  inProgress: number;
  confirmed: number;
  completed: number;
  totalValue: number;
}

interface BookingConflictData {
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
}

export class BookingStorage {
  private db = db;

  // ==== BOOKING METHODS ====
  
  async getBooking(id: number): Promise<any | null> {
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

  async getBookingsByUser(userId: string): Promise<any[]> {
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

  async createBooking(data: BookingData): Promise<any> {
    const result = await db.insert(bookings).values({
      userId: data.userId,
      title: data.gigType || 'New Booking',
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      clientAddress: data.clientAddress,
      venue: data.venue,
      venueAddress: data.venueAddress,
      eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
      eventTime: data.eventTime,
      eventEndTime: data.eventEndTime,
      gigType: data.gigType,
      fee: data.fee,
      status: data.status || 'new',
      specialRequirements: data.requirements,
      notes: data.notes,
      uploadedDocuments: data.documents || '[]',
    }).returning();
    return result[0];
  }

  async updateBooking(id: number, updates: BookingUpdate, userId: string): Promise<any> {
    const setData: any = {};
    
    if (updates.clientName !== undefined) setData.clientName = updates.clientName;
    if (updates.clientEmail !== undefined) setData.clientEmail = updates.clientEmail;
    if (updates.clientPhone !== undefined) setData.clientPhone = updates.clientPhone;
    if (updates.clientAddress !== undefined) setData.clientAddress = updates.clientAddress;
    if (updates.venue !== undefined) setData.venue = updates.venue;
    if (updates.venueAddress !== undefined) setData.venueAddress = updates.venueAddress;
    if (updates.eventTime !== undefined) setData.eventTime = updates.eventTime;
    if (updates.eventEndTime !== undefined) setData.eventEndTime = updates.eventEndTime;
    if (updates.gigType !== undefined) {
      setData.gigType = updates.gigType;
      setData.title = updates.gigType;
    }
    if (updates.fee !== undefined) setData.fee = updates.fee;
    if (updates.deposit !== undefined) setData.depositAmount = updates.deposit;
    if (updates.status !== undefined) setData.status = updates.status;
    if (updates.notes !== undefined) setData.notes = updates.notes;
    if (updates.requirements !== undefined) setData.specialRequirements = updates.requirements;
    if (updates.documents !== undefined) setData.uploadedDocuments = updates.documents;

    // Handle date conversion
    if (updates.eventDate !== undefined) {
      setData.eventDate = updates.eventDate ? new Date(updates.eventDate) : null;
    }

    const result = await db.update(bookings)
      .set(setData)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    
    return result[0];
  }

  async deleteBooking(id: number, userId: string): Promise<any> {
    const result = await db.delete(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    return result[0];
  }

  // ==== BOOKING STATISTICS ====
  
  async getBookingStats(userId: string): Promise<BookingStats> {
    const result = await db.select({
      total: sql<number>`count(*)`,
      new: sql<number>`count(case when status = 'new' then 1 end)`,
      inProgress: sql<number>`count(case when status = 'in_progress' then 1 end)`,
      confirmed: sql<number>`count(case when status = 'confirmed' then 1 end)`,
      completed: sql<number>`count(case when status = 'completed' then 1 end)`,
      totalValue: sql<number>`sum(cast(fee as decimal))`,
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

  async getRecentBookings(userId: string, limit: number = 5): Promise<any[]> {
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

  async getBookingsByStatus(userId: string, status: string): Promise<any[]> {
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

  async getUpcomingBookings(userId: string): Promise<any[]> {
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

  async getBookingsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<any[]> {
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

  // ==== CONFLICT DETECTION METHODS ====
  
  async checkBookingConflicts(
    userId: string, 
    eventDate: Date, 
    eventTime: string, 
    eventEndTime: string, 
    excludeId?: number
  ): Promise<any[]> {
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

  async createBookingConflict(data: BookingConflictData): Promise<any> {
    const result = await db.insert(bookingConflicts).values({
      userId: data.userId,
      enquiryId: data.enquiryId,
      conflictingId: data.conflictingId,
      conflictType: data.conflictType,
      conflictDate: data.conflictDate,
      severity: data.severity,
      travelTime: data.travelTime,
      distance: data.distance?.toString(),
      timeGap: data.timeGap,
      notes: data.notes,
    }).returning();
    return result[0];
  }

  async getBookingConflicts(userId: string, enquiryId: number): Promise<any[]> {
    return await db.select().from(bookingConflicts)
      .where(and(
        eq(bookingConflicts.userId, userId),
        eq(bookingConflicts.enquiryId, enquiryId)
      ))
      .orderBy(desc(bookingConflicts.createdAt));
  }

  async resolveBookingConflict(id: number, resolution: string, notes?: string): Promise<any> {
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

  // ==== ADMIN METHODS ====
  
  async getAllBookings(): Promise<any[]> {
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async getAllBookingsCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(bookings);
    return result[0]?.count || 0;
  }
}

export const bookingStorage = new BookingStorage();