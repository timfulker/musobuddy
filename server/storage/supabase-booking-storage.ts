import { createClient } from '@supabase/supabase-js';

// Determine which Supabase instance to use based on NODE_ENV and REPLIT_ENVIRONMENT
const isDevelopment = process.env.NODE_ENV === 'development' && process.env.REPLIT_ENVIRONMENT !== 'production';

const supabaseUrl = isDevelopment
  ? process.env.SUPABASE_URL_DEV
  : process.env.SUPABASE_URL_PROD;

const supabaseKey = isDevelopment
  ? process.env.SUPABASE_SERVICE_KEY_DEV
  : process.env.SUPABASE_SERVICE_KEY_PROD;

// Create Supabase client with service key (bypasses RLS)
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export class SupabaseBookingStorage {
  private isEnabled: boolean;

  constructor() {
    // Enable Supabase storage (the working database with proper schema)
    this.isEnabled = true;
    
    console.log('✅ Supabase booking storage ENABLED');
    console.log(`   Environment: ${process.env.NODE_ENV}`);
  }

  isSupabaseEnabled(): boolean {
    return this.isEnabled;
  }

  getMigrationMode(): string {
    return this.isEnabled ? 'supabase-primary' : 'drizzle-primary';
  }


  async createBooking(bookingData: any) {
    if (!this.isEnabled || !supabase) {
      throw new Error('Supabase is not enabled');
    }

    // Create minimal, schema-safe data for Supabase
    // Only include essential fields to avoid constraint violations
    const supabaseData = {
      user_id: bookingData.userId,
      title: bookingData.title || bookingData.clientName || 'Booking Request',
      client_name: bookingData.clientName || null,
      // Convert empty strings to null to avoid constraint violations
      client_email: bookingData.clientEmail && bookingData.clientEmail.trim() !== '' ? bookingData.clientEmail.trim() : null,
      client_phone: bookingData.clientPhone && bookingData.clientPhone.trim() !== '' ? bookingData.clientPhone.trim() : null,
      venue: bookingData.venue || null,
      venue_address: bookingData.venueAddress || null,
      event_date: bookingData.eventDate || null,
      event_time: bookingData.eventTime || null,
      event_end_time: bookingData.eventEndTime || null,
      status: bookingData.status || 'pending',
      notes: bookingData.notes || null,
      event_type: bookingData.eventType || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Only add optional fields if they have valid values

    if (bookingData.fee && bookingData.fee !== 0) {
      supabaseData.fee = bookingData.fee;
    }
    if (bookingData.finalAmount && bookingData.finalAmount !== 0) {
      supabaseData.final_amount = bookingData.finalAmount;
    }
    if (bookingData.deposit && bookingData.deposit !== 0) {
      supabaseData.deposit_amount = bookingData.deposit;
    }
    if (bookingData.clientAddress && bookingData.clientAddress.trim() !== '') {
      supabaseData.client_address = bookingData.clientAddress.trim();
    }

    console.log('📝 Creating booking in Supabase:', {
      client: supabaseData.client_name,
      venue: supabaseData.venue,
      date: supabaseData.event_date
    });

    const { data, error } = await supabase
      .from('bookings')
      .insert([supabaseData])
      .select()
      .maybeSingle();

    if (error) {
      console.error('❌ Supabase booking creation failed:', error);
      throw error;
    }

    console.log('✅ Booking created in Supabase with ID:', data.id);

    // Map back to camelCase for consistency
    return this.mapToCamelCase(data);
  }

  async getBooking(id: number, userId?: string) {
    if (!this.isEnabled || !supabase) {
      throw new Error('Supabase is not enabled');
    }

    let query = supabase
      .from('bookings')
      .select('*')
      .eq('id', id);

    // Add user filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('❌ Failed to fetch booking from Supabase:', error);
      throw error;
    }

    return this.mapToCamelCase(data);
  }

  async getBookings(userId: string) {
    console.log('🔍 [SUPABASE-BOOKINGS] Fetching bookings for user:', userId);

    if (!this.isEnabled || !supabase) {
      console.log('❌ [SUPABASE-BOOKINGS] Supabase is not enabled');
      throw new Error('Supabase is not enabled');
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: false });

    console.log('🔍 [SUPABASE-BOOKINGS] Query result:', data?.length || 0, 'bookings found');

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
      deposit: booking.deposit_amount, // Supabase uses deposit_amount
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
      // contactPerson: booking.contact_person, // Column doesn't exist in Supabase
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
      // mileage: booking.mileage, // Column doesn't exist
      // googlePlaceId: booking.google_place_id, // Column doesn't exist
      latitude: booking.map_latitude, // Supabase uses map_latitude
      longitude: booking.map_longitude, // Supabase uses map_longitude
      fieldLocks: booking.field_locks || {} // Add fieldLocks mapping
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}