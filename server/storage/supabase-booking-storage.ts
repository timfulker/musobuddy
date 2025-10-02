import { createClient } from '@supabase/supabase-js';

// Determine which Supabase instance to use based on NODE_ENV only
// We should use DEV database in development environment
const isDevelopment = process.env.NODE_ENV !== 'production';

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

console.log('🔧 [SUPABASE-BOOKING] Initialization:', {
  isDevelopment,
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  clientCreated: !!supabase,
  url: supabaseUrl?.substring(0, 30) + '...'
});

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

    // Create comprehensive field mappings for Supabase
    const supabaseData: any = {
      user_id: bookingData.userId,
      title: bookingData.title || bookingData.clientName || 'Booking Request',
      client_name: bookingData.clientName || null,
      client_email: bookingData.clientEmail && bookingData.clientEmail.trim() !== '' ? bookingData.clientEmail.trim() : null,
      client_phone: bookingData.clientPhone && bookingData.clientPhone.trim() !== '' ? bookingData.clientPhone.trim() : null,
      client_address: bookingData.clientAddress && bookingData.clientAddress.trim() !== '' ? bookingData.clientAddress.trim() : null,
      venue: bookingData.venue || null,
      venue_address: bookingData.venueAddress || null,
      event_date: bookingData.eventDate || null,
      event_time: bookingData.eventTime || null,
      event_end_time: bookingData.eventEndTime || null,
      status: bookingData.status || 'pending',
      notes: bookingData.notes || null,
      gig_type: bookingData.gigType || null,
      event_type: bookingData.eventType || null,
      equipment_requirements: bookingData.equipmentRequirements || null,
      special_requirements: bookingData.specialRequirements || null,
      performance_duration: bookingData.performanceDuration || null,
      styles: bookingData.styles || null,
      equipment_provided: bookingData.equipmentProvided || null,
      whats_included: bookingData.whatsIncluded || null,
      dress_code: bookingData.dressCode || null,
      contact_phone: bookingData.contactPhone || null,
      parking_info: bookingData.parkingInfo || null,
      venue_contact_info: bookingData.venueContactInfo || null,
      travel_expense: bookingData.travelExpense || null,
      what3words: bookingData.what3words || null,
      venue_contact: bookingData.venueContact || null,
      sound_tech_contact: bookingData.soundTechContact || null,
      stage_size: bookingData.stageSize || null,
      power_equipment: bookingData.powerEquipment || null,
      style_mood: bookingData.styleMood || null,
      must_play_songs: bookingData.mustPlaySongs || null,
      avoid_songs: bookingData.avoidSongs || null,
      set_order: bookingData.setOrder || null,
      first_dance_song: bookingData.firstDanceSong || null,
      processional_song: bookingData.processionalSong || null,
      signing_register_song: bookingData.signingRegisterSong || null,
      recessional_song: bookingData.recessionalSong || null,
      special_dedications: bookingData.specialDedications || null,
      guest_announcements: bookingData.guestAnnouncements || null,
      load_in_info: bookingData.loadInInfo || null,
      sound_check_time: bookingData.soundCheckTime || null,
      weather_contingency: bookingData.weatherContingency || null,
      parking_permit_required: bookingData.parkingPermitRequired || false,
      meal_provided: bookingData.mealProvided || false,
      dietary_requirements: bookingData.dietaryRequirements || null,
      shared_notes: bookingData.sharedNotes || null,
      reference_tracks: bookingData.referenceTracks || null,
      photo_permission: bookingData.photoPermission !== undefined ? bookingData.photoPermission : true,
      encore_allowed: bookingData.encoreAllowed !== undefined ? bookingData.encoreAllowed : true,
      encore_suggestions: bookingData.encoreSuggestions || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Handle special numeric fields
    if (bookingData.fee !== undefined && bookingData.fee !== null && bookingData.fee !== '') {
      supabaseData.fee = bookingData.fee;
    }
    if (bookingData.finalAmount !== undefined && bookingData.finalAmount !== null && bookingData.finalAmount !== '') {
      supabaseData.final_amount = bookingData.finalAmount;
    }
    if (bookingData.deposit !== undefined && bookingData.deposit !== null && bookingData.deposit !== '') {
      supabaseData.deposit_amount = bookingData.deposit;
    }

    // Add location fields with special mapping
    if (bookingData.latitude !== undefined && bookingData.latitude !== null) {
      supabaseData.map_latitude = bookingData.latitude;
    }
    if (bookingData.longitude !== undefined && bookingData.longitude !== null) {
      supabaseData.map_longitude = bookingData.longitude;
    }

    // Add apply_now_link for Encore bookings
    if (bookingData.applyNowLink && bookingData.applyNowLink.trim() !== '') {
      supabaseData.apply_now_link = bookingData.applyNowLink.trim();
      console.log('🎵 Adding apply_now_link to Supabase data:', bookingData.applyNowLink);
    }

    console.log('📝 Creating booking in Supabase:', {
      client: supabaseData.client_name,
      venue: supabaseData.venue,
      date: supabaseData.event_date,
      applyNowLink: supabaseData.apply_now_link || 'None'
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

    // Debug: Check raw data from Supabase
    console.log(`🎭 [SUPABASE-RAW] Booking ${id} raw data:`, {
      performance_duration: data.performance_duration,
      performanceDuration: data.performanceDuration
    });

    const mapped = this.mapToCamelCase(data);

    // Debug: Check after mapping
    console.log(`🎭 [SUPABASE-MAPPED] Booking ${id} after mapping:`, {
      performanceDuration: mapped.performanceDuration
    });

    return mapped;
  }

  // Method for fetching ALL bookings (use sparingly - for exports, reports)
  async getAllBookings(userId: string) {
    if (!this.isEnabled || !supabase) {
      throw new Error('Supabase is not enabled');
    }

    console.log('⚠️ [SUPABASE-BOOKINGS] Fetching ALL bookings - this may be slow');

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: false })
      .limit(50000);

    if (error) {
      console.error('❌ Failed to fetch all bookings from Supabase:', error);
      throw error;
    }

    return data.map(booking => this.mapToCamelCase(booking));
  }

  async getBookings(userId: string) {
    // ENVIRONMENT DEBUG
    const projectId = supabaseUrl?.split('.')[0].split('//')[1];
    console.log(`🔍 [SUPABASE-BOOKINGS] Fetching from database: ${projectId} for user: ${userId}`);

    if (!this.isEnabled || !supabase) {
      console.log('❌ [SUPABASE-BOOKINGS] Supabase is not enabled');
      throw new Error('Supabase is not enabled');
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('event_date', { ascending: false })
      .limit(5000); // Reasonable limit - most musicians won't have more than this

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

    // Map camelCase updates to snake_case with special handling for certain fields
    const supabaseUpdates: any = {};
    Object.keys(updates).forEach(key => {
      // Skip fields that don't exist in Supabase schema
      const nonExistentFields = ['contactPerson']; // contactPerson column doesn't exist in Supabase
      if (nonExistentFields.includes(key)) {
        console.log(`⚠️ [SUPABASE] Skipping non-existent field '${key}' - column not in database schema`);
        return;
      }

      // CRITICAL FIX: Don't overwrite existing data with empty values
      // Skip numeric fields that are empty to preserve existing database values
      const numericFields = [
        'fee', 'setupTime', 'soundCheckTime', 'packupTime',
        'travelTime', 'mileage', 'distanceInMiles', 'distanceInKm',
        'quotedAmount', 'travelExpense', 'depositAmount', 'finalAmount', 'totalFee'
      ];

      if (numericFields.includes(key) &&
          (updates[key] === '' || updates[key] === undefined || updates[key] === null)) {
        console.log(`⚠️ [SUPABASE] Skipping empty field '${key}' to preserve existing data`);
        return; // Skip empty numeric fields entirely
      }

      // Special field mappings that don't follow simple camelToSnake rules
      const fieldMappings: { [key: string]: string } = {
        'deposit': 'deposit_amount',  // deposit maps to deposit_amount in Supabase
        'latitude': 'map_latitude',   // latitude maps to map_latitude
        'longitude': 'map_longitude',  // longitude maps to map_longitude
        'totalFee': 'final_amount',   // totalFee maps to final_amount in Supabase
      };

      // Use special mapping if exists, otherwise use standard camelToSnake
      const snakeKey = fieldMappings[key] || this.camelToSnake(key);
      supabaseUpdates[snakeKey] = updates[key];
    });

    supabaseUpdates.updated_at = new Date().toISOString();

    console.log(`🔄 [SUPABASE-UPDATE] Updating booking ${id} with fields:`, Object.keys(supabaseUpdates));
    console.log(`🔄 [SUPABASE-UPDATE] Update values:`, JSON.stringify(supabaseUpdates, null, 2));

    console.log(`🔍 [SUPABASE-UPDATE-DEBUG] About to update booking ${id} for user ${userId}`);
    console.log(`🔍 [SUPABASE-UPDATE-DEBUG] Final update object:`, supabaseUpdates);

    const { data, error } = await supabase
      .from('bookings')
      .update(supabaseUpdates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    console.log(`🔍 [SUPABASE-UPDATE-RESULT] Update completed - Data:`, data);
    console.log(`🔍 [SUPABASE-UPDATE-RESULT] Update completed - Error:`, error);

    if (error) {
      console.error('❌ Failed to update booking in Supabase:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`✅ [SUPABASE-UPDATE] Successfully updated booking ${id}`);
    return this.mapToCamelCase(data);
  }

  async deleteBooking(id: number, userId: string) {
    if (!this.isEnabled || !supabase) {
      throw new Error('Supabase is not enabled');
    }

    // ENVIRONMENT DEBUG
    const projectId = supabaseUrl?.split('.')[0].split('//')[1];
    console.log(`🗑️ [STORAGE] Deleting from database: ${projectId}, Booking: ${id}, User: ${userId}`);

    // First, handle ALL foreign key dependencies
    try {
      // For unparseable_messages: DELETE the messages that were converted to this booking
      const { error: deleteMessagesError } = await supabase
        .from('unparseable_messages')
        .delete()
        .eq('converted_to_booking_id', id);

      if (deleteMessagesError) {
        console.warn(`⚠️ Warning: Could not delete unparseable_messages for booking ${id}:`, deleteMessagesError);
      } else {
        console.log(`🗑️ Deleted unparseable_messages associated with booking ${id}`);
      }
    } catch (deleteErr) {
      console.warn(`⚠️ Warning: Error deleting unparseable_messages:`, deleteErr);
    }

    // For contracts: just clear the reference (don't delete contracts)
    try {
      const { error: clearContractsError } = await supabase
        .from('contracts')
        .update({ enquiry_id: null })
        .eq('enquiry_id', id);

      if (clearContractsError) {
        console.warn(`⚠️ Warning: Could not clear contracts.enquiry_id references:`, clearContractsError);
      } else {
        console.log(`🔗 Cleared contracts.enquiry_id references for booking ${id}`);
      }
    } catch (clearErr) {
      console.warn(`⚠️ Warning: Error clearing contracts dependencies:`, clearErr);
    }

    // Now delete the booking
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
      applyNowLink: booking.apply_now_link, // Map Encore apply link
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

      // Contract and workflow fields - CRITICAL for status display
      contractSent: booking.contract_sent,
      contractSigned: booking.contract_signed,
      invoiceSent: booking.invoice_sent,
      paidInFull: booking.paid_in_full,
      workflowStage: booking.workflow_stage,
      lastContactedAt: booking.last_contacted_at,

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