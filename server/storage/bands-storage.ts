/**
 * Bands Storage Module
 * Handles all band/project-related database operations
 */

import { createClient } from '@supabase/supabase-js';
import type { Band, InsertBand } from '@shared/schema';

// Determine which Supabase instance to use based on NODE_ENV
const supabaseUrl = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_URL_PROD
  : process.env.SUPABASE_URL_DEV;

const supabaseKey = process.env.NODE_ENV === 'production'
  ? process.env.SUPABASE_SERVICE_KEY_PROD
  : process.env.SUPABASE_SERVICE_KEY_DEV;

// Create Supabase client with service key (bypasses RLS)
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export class BandsStorage {
  // Get all bands for a user
  async getBandsByUserId(userId: string): Promise<Band[]> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    const { data, error } = await supabase
      .from('bands')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching bands:', error);
      throw error;
    }

    // If user has no bands, create a default one
    if (!data || data.length === 0) {
      const defaultBand = await this.createBand({
        userId,
        name: 'Solo',
        color: '#9333ea',
        isDefault: true,
        displayOrder: 0
      });
      return [defaultBand];
    }

    return data;
  }

  // Get a single band by ID with ownership check
  async getBandById(bandId: number, userId: string): Promise<Band | null> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    const { data, error } = await supabase
      .from('bands')
      .select('*')
      .eq('id', bandId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching band:', error);
      throw error;
    }

    return data;
  }

  // Create a new band
  async createBand(band: Omit<InsertBand, 'id' | 'createdAt' | 'updatedAt'>): Promise<Band> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    // If this is set as default, unset other defaults for this user
    if (band.isDefault) {
      await supabase
        .from('bands')
        .update({ is_default: false })
        .eq('user_id', band.userId);
    }

    const { data, error } = await supabase
      .from('bands')
      .insert({
        user_id: band.userId,
        name: band.name,
        color: band.color,
        is_default: band.isDefault || false,
        display_order: band.displayOrder || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating band:', error);
      throw error;
    }

    return data;
  }

  // Update a band
  async updateBand(
    bandId: number,
    userId: string,
    updates: Partial<Omit<Band, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<Band> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    // If setting as default, unset other defaults for this user
    if (updates.isDefault) {
      await supabase
        .from('bands')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;

    const { data, error } = await supabase
      .from('bands')
      .update(updateData)
      .eq('id', bandId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating band:', error);
      throw error;
    }

    return data;
  }

  // Delete a band
  async deleteBand(bandId: number, userId: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    const { error } = await supabase
      .from('bands')
      .delete()
      .eq('id', bandId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting band:', error);
      throw error;
    }
  }

  // Get the default band for a user
  async getDefaultBand(userId: string): Promise<Band | null> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    const { data, error } = await supabase
      .from('bands')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No default band, create one
        return this.createBand({
          userId,
          name: 'Solo',
          color: '#9333ea',
          isDefault: true,
          displayOrder: 0
        });
      }
      console.error('Error fetching default band:', error);
      throw error;
    }

    return data;
  }

  // Update band order for drag-and-drop reordering
  async updateBandOrder(userId: string, bandOrders: { id: number; displayOrder: number }[]): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not configured');
    }

    // Update each band's display order
    for (const { id, displayOrder } of bandOrders) {
      const { error } = await supabase
        .from('bands')
        .update({ display_order: displayOrder })
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error(`Error updating band order for band ${id}:`, error);
        throw error;
      }
    }
  }
}