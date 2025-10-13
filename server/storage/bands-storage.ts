/**
 * Bands Storage Module
 * Handles all band/project-related database operations
 */

import { db } from "../core/database";
import { bands } from "../../shared/schema";
import type { Band, InsertBand } from '@shared/schema';
import { eq, desc, asc, and } from "drizzle-orm";

export class BandsStorage {
  private db = db;

  // Get all bands for a user
  async getBandsByUserId(userId: string): Promise<Band[]> {
    const result = await db.select().from(bands)
      .where(eq(bands.userId, userId))
      .orderBy(asc(bands.displayOrder), asc(bands.createdAt));

    // If user has no bands, create a default one
    if (!result || result.length === 0) {
      const defaultBand = await this.createBand({
        userId,
        name: 'Solo',
        color: '#9333ea',
        isDefault: true,
        displayOrder: 0
      });
      return [defaultBand];
    }

    return result;
  }

  // Get a single band by ID with ownership check
  async getBandById(bandId: number, userId: string): Promise<Band | null> {
    const result = await db.select().from(bands)
      .where(and(eq(bands.id, bandId), eq(bands.userId, userId)));

    return result[0] || null;
  }

  // Create a new band
  async createBand(band: Omit<InsertBand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Band> {
    // If this is set as default, unset other defaults for this user
    if (band.isDefault) {
      await db.update(bands)
        .set({ isDefault: false })
        .where(eq(bands.userId, band.userId));
    }

    const result = await db.insert(bands).values({
      userId: band.userId,
      name: band.name,
      color: band.color,
      isDefault: band.isDefault || false,
      displayOrder: band.displayOrder || 0
    }).returning();

    if (!result[0]) {
      throw new Error('Failed to create band');
    }

    return result[0];
  }

  // Update a band
  async updateBand(
    bandId: number,
    userId: string,
    updates: Partial<Omit<Band, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Band> {
    // If setting as default, unset other defaults for this user
    if (updates.isDefault) {
      await db.update(bands)
        .set({ isDefault: false })
        .where(eq(bands.userId, userId));
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
    if (updates.displayOrder !== undefined) updateData.displayOrder = updates.displayOrder;

    const result = await db.update(bands)
      .set(updateData)
      .where(and(eq(bands.id, bandId), eq(bands.userId, userId)))
      .returning();

    if (!result[0]) {
      throw new Error('Failed to update band or band not found');
    }

    return result[0];
  }

  // Delete a band
  async deleteBand(bandId: number, userId: string): Promise<void> {
    await db.delete(bands)
      .where(and(eq(bands.id, bandId), eq(bands.userId, userId)));
  }

  // Get the default band for a user
  async getDefaultBand(userId: string): Promise<Band | null> {
    const result = await db.select().from(bands)
      .where(and(eq(bands.userId, userId), eq(bands.isDefault, true)));

    if (!result[0]) {
      // No default band, create one
      return this.createBand({
        userId,
        name: 'Solo',
        color: '#9333ea',
        isDefault: true,
        displayOrder: 0
      });
    }

    return result[0];
  }

  // Update band order for drag-and-drop reordering
  async updateBandOrder(userId: string, bandOrders: { id: number; displayOrder: number }[]): Promise<void> {
    // Update each band's display order
    for (const { id, displayOrder } of bandOrders) {
      await db.update(bands)
        .set({ displayOrder })
        .where(and(eq(bands.id, id), eq(bands.userId, userId)));
    }
  }
}