import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

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

export class SupabaseBookingStorage {
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.USE_SUPABASE === 'true' && supabase !== null;

    if (this.isEnabled) {
      console.log('✅ Supabase booking storage initialized');
      console.log(`   Mode: ${process.env.SUPABASE_MIGRATION_MODE}`);
      console.log(`   Environment: ${process.env.NODE_ENV}`);
    }
  }

  isSupabaseEnabled(): boolean {
    return this.isEnabled;
  }

  getMigrationMode(): string {
    return process.env.SUPABASE_MIGRATION_MODE || 'parallel';
  }

  async createBooking(bookingData: any) {
    if (!this.isEnabled || !supabase) {
      throw new Error('Supabase is not enabled');
    }

    // Map camelCase to snake_case for Supabase
    const supabaseData = {
      user_id: bookingData.userId,
      title: bookingData.title,
      client_name: bookingData.clientName,
      client_email: bookingData.clientEmail,
      client_phone: bookingData.clientPhone,
      client_address: bookingData.clientAddress,
      venue: bookingData.venue,
      venue_address: bookingData.venueAddress,
      event_date: bookingData.eventDate,
      event_time: bookingData.eventTime,
      event_end_time: bookingData.eventEndTime,
      fee: bookingData.fee,
      final_amount: bookingData.finalAmount,
      deposit: bookingData.deposit,
      status: bookingData.status,
      notes: bookingData.notes,
      gig_type: bookingData.gigType,
      event_type: bookingData.eventType,
      equipment_requirements: bookingData.equipmentRequirements,
      special_requirements: bookingData.specialRequirements,
      performance_duration: bookingData.performanceDuration,
      styles: bookingData.styles,
      equipment_provided: bookingData.equipmentProvided,
      whats_included: bookingData.whatsIncluded,
      dress_code: bookingData.dressCode,
      contact_person: bookingData.contactPerson,
      contact_phone: bookingData.contactPhone,
      parking_info: bookingData.parkingInfo,
      venue_contact_info: bookingData.venueContactInfo,
      travel_expense: bookingData.travelExpense,
      what3words: bookingData.what3words,
      // Collaborative fields
      venue_contact: bookingData.venueContact,
      sound_tech_contact: bookingData.soundTechContact,
      stage_size: bookingData.stageSize,
      power_equipment: bookingData.powerEquipment,
      style_mood: bookingData.styleMood,
      must_play_songs: bookingData.mustPlaySongs,
      avoid_songs: bookingData.avoidSongs,
      set_order: bookingData.setOrder,
      first_dance_song: bookingData.firstDanceSong,
      processional_song: bookingData.processionalSong,
      signing_register_song: bookingData.signingRegisterSong,
      recessional_song: bookingData.recessionalSong,
      special_dedications: bookingData.specialDedications,
      guest_announcements: bookingData.guestAnnouncements,
      load_in_info: bookingData.loadInInfo,
      sound_check_time: bookingData.soundCheckTime,
      weather_contingency: bookingData.weatherContingency,
      parking_permit_required: bookingData.parkingPermitRequired,
      meal_provided: bookingData.mealProvided,
      dietary_requirements: bookingData.dietaryRequirements,
      shared_notes: bookingData.sharedNotes,
      reference_tracks: bookingData.referenceTracks,
      photo_permission: bookingData.photoPermission,
      encore_allowed: bookingData.encoreAllowed,
      encore_suggestions: bookingData.encoreSuggestions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Creating booking in Supabase:', {
      client: supabaseData.client_name,
      venue: supabaseData.venue,
      date: supabaseData.event_date
    });

    const { data, error } = await supabase
      .from('bookings')
      .insert([supabaseData])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase booking creation failed:', error);
      throw error;
    }

    console.log('✅ Booking created in Supabase with ID:', data.id);

    // Map back to camelCase for consistency
    return this.mapToCamelCase(data);
  }

  async getBookings(userId: string) {
    if (!this.isEnabled || !supabase) {
      throw new Error('Supabase is not enabled');
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch bookings from Supabase:', error);
      throw error;
    }

    return data.map(booking => this.mapToCamelCase(booking));
  }

  async updateBooking(id: number, updates: any, userId: string) {
    if (!this.isEnabled || !supabase) {
      throw new Error('Supabase is not enabled');
    }

    // Map camelCase updates to snake_case
    const supabaseUpdates: any = {};
    Object.keys(updates).forEach(key => {
      const snakeKey = this.camelToSnake(key);
      supabaseUpdates[snakeKey] = updates[key];
    });

    supabaseUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('bookings')
      .update(supabaseUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to update booking in Supabase:', error);
      throw error;
    }

    return this.mapToCamelCase(data);
  }

  async deleteBooking(id: number, userId: string) {
    if (!this.isEnabled || !supabase) {
      throw new Error('Supabase is not enabled');
    }

    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Failed to delete booking from Supabase:', error);
      throw error;
    }

    console.log('✅ Booking deleted from Supabase:', id);
    return true;
  }

  private mapToCamelCase(booking: any) {
    return {
      id: booking.id,
      userId: booking.user_id,
      title: booking.title,
      clientName: booking.client_name,
      clientEmail: booking.client_email,
      clientPhone: booking.client_phone,
      clientAddress: booking.client_address,
      venue: booking.venue,
      venueAddress: booking.venue_address,
      eventDate: booking.event_date,
      eventTime: booking.event_time,
      eventEndTime: booking.event_end_time,
      fee: booking.fee,
      finalAmount: booking.final_amount,
      deposit: booking.deposit,
      status: booking.status,
      notes: booking.notes,
      gigType: booking.gig_type,
      eventType: booking.event_type,
      equipmentRequirements: booking.equipment_requirements,
      specialRequirements: booking.special_requirements,
      performanceDuration: booking.performance_duration,
      styles: booking.styles,
      equipmentProvided: booking.equipment_provided,
      whatsIncluded: booking.whats_included,
      dressCode: booking.dress_code,
      contactPerson: booking.contact_person,
      contactPhone: booking.contact_phone,
      parkingInfo: booking.parking_info,
      venueContactInfo: booking.venue_contact_info,
      travelExpense: booking.travel_expense,
      what3words: booking.what3words,
      venueContact: booking.venue_contact,
      soundTechContact: booking.sound_tech_contact,
      stageSize: booking.stage_size,
      powerEquipment: booking.power_equipment,
      styleMood: booking.style_mood,
      mustPlaySongs: booking.must_play_songs,
      avoidSongs: booking.avoid_songs,
      setOrder: booking.set_order,
      firstDanceSong: booking.first_dance_song,
      processionalSong: booking.processional_song,
      signingRegisterSong: booking.signing_register_song,
      recessionalSong: booking.recessional_song,
      specialDedications: booking.special_dedications,
      guestAnnouncements: booking.guest_announcements,
      loadInInfo: booking.load_in_info,
      soundCheckTime: booking.sound_check_time,
      weatherContingency: booking.weather_contingency,
      parkingPermitRequired: booking.parking_permit_required,
      mealProvided: booking.meal_provided,
      dietaryRequirements: booking.dietary_requirements,
      sharedNotes: booking.shared_notes,
      referenceTracks: booking.reference_tracks,
      photoPermission: booking.photo_permission,
      encoreAllowed: booking.encore_allowed,
      encoreSuggestions: booking.encore_suggestions,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
      mileage: booking.mileage,
      googlePlaceId: booking.google_place_id,
      latitude: booking.latitude,
      longitude: booking.longitude
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}