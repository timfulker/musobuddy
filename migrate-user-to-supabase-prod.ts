#!/usr/bin/env node

/**
 * Comprehensive User Data Migration Script
 * 
 * Migrates all data for user "timfulkermusic@gmail.com" from Neon database
 * to Supabase production database, preserving relationships and documents.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createClient } from '@supabase/supabase-js';
import { eq, and } from 'drizzle-orm';
import * as schema from './shared/schema';

// Email to migrate
const TARGET_EMAIL = 'timfulkermusic@gmail.com';

// Environment configuration - force production mode
process.env.NODE_ENV = 'production';

// Database connections
const NEON_CONNECTION_STRING = process.env.DATABASE_URL; // Neon database
const SUPABASE_URL = process.env.SUPABASE_URL_PROD;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY_PROD;

if (!NEON_CONNECTION_STRING) {
  throw new Error('DATABASE_URL environment variable is required (Neon source database)');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL_PROD and SUPABASE_SERVICE_KEY_PROD environment variables are required');
}

// Database clients
const neonPool = new Pool({
  connectionString: NEON_CONNECTION_STRING,
  ssl: { rejectUnauthorized: false },
});

const neonDb = drizzle(neonPool, { schema });

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Logging utilities
function log(message: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${message}`, data || '');
}

function logSuccess(message: string, data?: any) {
  console.log(`✅ [${new Date().toISOString()}] ${message}`, data || '');
}

function logError(message: string, error?: any) {
  console.error(`❌ [${new Date().toISOString()}] ${message}`, error || '');
}

// Migration state tracking
interface MigrationState {
  sourceUserId: string;
  supabaseUserId: string;
  migratedTables: Record<string, number>;
  errors: Array<{ table: string; error: string; data?: any }>;
}

/**
 * Test database connections
 */
async function testConnections(): Promise<void> {
  log('Testing database connections...');
  
  // Test Neon connection
  try {
    const neonClient = await neonPool.connect();
    await neonClient.query('SELECT 1 as test');
    neonClient.release();
    logSuccess('Neon database connection successful');
  } catch (error) {
    logError('Neon database connection failed:', error);
    throw error;
  }
  
  // Test Supabase connection
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') { // Table doesn't exist is ok for this test
      throw error;
    }
    logSuccess('Supabase database connection successful');
  } catch (error) {
    logError('Supabase database connection failed:', error);
    throw error;
  }
}

/**
 * Find user in Neon database
 */
async function findUserInNeon(email: string): Promise<any> {
  log(`Searching for user: ${email}`);
  
  const users = await neonDb
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email));
  
  if (users.length === 0) {
    throw new Error(`User ${email} not found in Neon database`);
  }
  
  if (users.length > 1) {
    logError(`Multiple users found with email ${email}:`, users.map(u => ({ id: u.id, email: u.email })));
    throw new Error(`Multiple users found with email ${email}`);
  }
  
  const user = users[0];
  logSuccess(`Found user in Neon:`, { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });
  
  return user;
}

/**
 * Create Supabase Auth user
 */
async function createSupabaseAuthUser(sourceUser: any): Promise<string> {
  log(`Creating Supabase Auth user for: ${sourceUser.email}`);
  
  // Generate a temporary password - user will need to reset it
  const tempPassword = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: sourceUser.email,
    password: tempPassword,
    email_confirm: true, // Auto-confirm
    user_metadata: {
      firstName: sourceUser.firstName,
      lastName: sourceUser.lastName,
      migrated_from_neon: true,
      migration_date: new Date().toISOString(),
      original_neon_id: sourceUser.id,
    },
  });
  
  if (error) {
    // Check if user already exists
    if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
      log('User already exists in Supabase Auth, fetching existing user...');
      
      const { data: existingUsers, error: fetchError } = await supabase.auth.admin.listUsers();
      if (fetchError) {
        throw new Error(`Failed to fetch existing users: ${fetchError.message}`);
      }
      
      const existingUser = existingUsers.users.find(u => u.email === sourceUser.email);
      if (!existingUser) {
        throw new Error(`User exists but could not be found: ${sourceUser.email}`);
      }
      
      logSuccess(`Using existing Supabase Auth user:`, { id: existingUser.id, email: existingUser.email });
      return existingUser.id;
    }
    
    throw new Error(`Failed to create Supabase Auth user: ${error.message}`);
  }
  
  if (!data.user) {
    throw new Error('User created but no user object returned');
  }
  
  logSuccess(`Created Supabase Auth user:`, { id: data.user.id, email: data.user.email });
  log(`⚠️  IMPORTANT: User will need to reset password using: ${tempPassword}`);
  
  return data.user.id;
}

/**
 * Extract all user data from Neon database using raw SQL to avoid schema mismatches
 */
async function extractUserData(userId: string): Promise<Record<string, any[]>> {
  log(`Extracting all data for user: ${userId}`);
  
  const userData: Record<string, any[]> = {};
  
  // Helper function to execute raw SQL queries
  async function queryNeonRaw(sql: string, params: any[] = []): Promise<any[]> {
    const client = await neonPool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  // 1. Users (main record)
  userData.users = await queryNeonRaw('SELECT * FROM users WHERE id = $1', [userId]);
  log(`Found ${userData.users.length} user records`);
  
  if (userData.users.length === 0) {
    throw new Error(`User ${userId} not found`);
  }
  
  const user = userData.users[0];
  
  // 2. User-related tables (check if they exist first)
  try {
    userData.userActivity = await queryNeonRaw('SELECT * FROM user_activity WHERE user_id = $1', [userId]);
    log(`Found ${userData.userActivity.length} user activity records`);
  } catch (error: any) {
    log(`Skipping user_activity: ${error.message}`);
    userData.userActivity = [];
  }
  
  try {
    userData.userLoginHistory = await queryNeonRaw('SELECT * FROM user_login_history WHERE user_id = $1', [userId]);
    log(`Found ${userData.userLoginHistory.length} login history records`);
  } catch (error: any) {
    log(`Skipping user_login_history: ${error.message}`);
    userData.userLoginHistory = [];
  }
  
  try {
    userData.userMessages = await queryNeonRaw('SELECT * FROM user_messages WHERE to_user_id = $1 OR from_user_id = $1', [userId]);
    log(`Found ${userData.userMessages.length} user messages`);
  } catch (error: any) {
    log(`Skipping user_messages: ${error.message}`);
    userData.userMessages = [];
  }
  
  try {
    userData.supportTickets = await queryNeonRaw('SELECT * FROM support_tickets WHERE user_id = $1', [userId]);
    log(`Found ${userData.supportTickets.length} support tickets`);
  } catch (error: any) {
    log(`Skipping support_tickets: ${error.message}`);
    userData.supportTickets = [];
  }
  
  try {
    userData.userAuditLogs = await queryNeonRaw('SELECT * FROM user_audit_logs WHERE user_id = $1', [userId]);
    log(`Found ${userData.userAuditLogs.length} audit log records`);
  } catch (error: any) {
    log(`Skipping user_audit_logs: ${error.message}`);
    userData.userAuditLogs = [];
  }
  
  try {
    userData.blockedDates = await queryNeonRaw('SELECT * FROM blocked_dates WHERE user_id = $1', [userId]);
    log(`Found ${userData.blockedDates.length} blocked dates`);
  } catch (error: any) {
    log(`Skipping blocked_dates: ${error.message}`);
    userData.blockedDates = [];
  }
  
  try {
    userData.phoneVerifications = await queryNeonRaw('SELECT * FROM phone_verifications WHERE phone_number = $1', [user.phone_number || '']);
    log(`Found ${userData.phoneVerifications.length} phone verification records`);
  } catch (error: any) {
    log(`Skipping phone_verifications: ${error.message}`);
    userData.phoneVerifications = [];
  }
  
  try {
    userData.securityMonitoring = await queryNeonRaw('SELECT * FROM security_monitoring WHERE user_id = $1', [userId]);
    log(`Found ${userData.securityMonitoring.length} security monitoring records`);
  } catch (error: any) {
    log(`Skipping security_monitoring: ${error.message}`);
    userData.securityMonitoring = [];
  }
  
  try {
    userData.userSecurityStatus = await queryNeonRaw('SELECT * FROM user_security_status WHERE user_id = $1', [userId]);
    log(`Found ${userData.userSecurityStatus.length} security status records`);
  } catch (error: any) {
    log(`Skipping user_security_status: ${error.message}`);
    userData.userSecurityStatus = [];
  }
  
  try {
    userData.smsVerifications = await queryNeonRaw('SELECT * FROM sms_verifications WHERE phone_number = $1', [user.phone_number || '']);
    log(`Found ${userData.smsVerifications.length} SMS verification records`);
  } catch (error: any) {
    log(`Skipping sms_verifications: ${error.message}`);
    userData.smsVerifications = [];
  }
  
  // 3. Bookings
  try {
    userData.bookings = await queryNeonRaw('SELECT * FROM bookings WHERE user_id = $1', [userId]);
    log(`Found ${userData.bookings.length} bookings`);
  } catch (error: any) {
    log(`Skipping bookings: ${error.message}`);
    userData.bookings = [];
  }
  
  // 4. Contracts (linked to user and bookings)
  try {
    userData.contracts = await queryNeonRaw('SELECT * FROM contracts WHERE user_id = $1', [userId]);
    log(`Found ${userData.contracts.length} contracts`);
  } catch (error: any) {
    log(`Skipping contracts: ${error.message}`);
    userData.contracts = [];
  }
  
  // 5. Invoices (linked to user and bookings)
  try {
    userData.invoices = await queryNeonRaw('SELECT * FROM invoices WHERE user_id = $1', [userId]);
    log(`Found ${userData.invoices.length} invoices`);
  } catch (error: any) {
    log(`Skipping invoices: ${error.message}`);
    userData.invoices = [];
  }
  
  // 6. Documents (linked to bookings)
  try {
    userData.bookingDocuments = await queryNeonRaw('SELECT * FROM booking_documents WHERE user_id = $1', [userId]);
    log(`Found ${userData.bookingDocuments.length} booking documents`);
  } catch (error: any) {
    log(`Skipping booking_documents: ${error.message}`);
    userData.bookingDocuments = [];
  }
  
  // 7. Communication logs
  try {
    userData.clientCommunications = await queryNeonRaw('SELECT * FROM client_communications WHERE user_id = $1', [userId]);
    log(`Found ${userData.clientCommunications.length} communication records`);
  } catch (error: any) {
    log(`Skipping client_communications: ${error.message}`);
    userData.clientCommunications = [];
  }
  
  // 8. Compliance logs
  try {
    userData.complianceDocuments = await queryNeonRaw('SELECT * FROM compliance_documents WHERE user_id = $1', [userId]);
    log(`Found ${userData.complianceDocuments.length} compliance documents`);
  } catch (error: any) {
    log(`Skipping compliance_documents: ${error.message}`);
    userData.complianceDocuments = [];
  }
  
  try {
    userData.complianceSentLog = await queryNeonRaw('SELECT * FROM compliance_sent_log WHERE user_id = $1', [userId]);
    log(`Found ${userData.complianceSentLog.length} compliance sent logs`);
  } catch (error: any) {
    log(`Skipping compliance_sent_log: ${error.message}`);
    userData.complianceSentLog = [];
  }
  
  // 9. Message notifications
  try {
    userData.messageNotifications = await queryNeonRaw('SELECT * FROM message_notifications WHERE user_id = $1', [userId]);
    log(`Found ${userData.messageNotifications.length} message notifications`);
  } catch (error: any) {
    log(`Skipping message_notifications: ${error.message}`);
    userData.messageNotifications = [];
  }
  
  // Trial usage tracking - skip, doesn't exist in Neon
  userData.trialUsageTracking = [];
  log(`Found 0 trial usage records (table doesn't exist in Neon)`);
  
  return userData;
}

/**
 * Create column mapping functions to handle schema differences
 */
function createColumnMappers() {
  // Define column mappings for each table
  const supabaseSchemaColumns = {
    users: [
      'id', 'email', 'first_name', 'last_name', 'profile_image_url', 'is_admin', 'is_assigned', 'is_beta_tester',
      'trial_ends_at', 'has_paid', 'onboarding_completed', 'account_notes', 'stripe_customer_id', 'stripe_subscription_id',
      'email_prefix', 'quick_add_token', 'widget_url', 'widget_qr_code', 'phone_number', 'firebase_uid', 'supabase_uid',
      'is_active', 'last_login_at', 'last_login_ip', 'login_attempts', 'locked_until', 'created_at', 'updated_at'
    ],
    bookings: [
      'id', 'user_id', 'client_name', 'client_email', 'client_phone', 'client_address', 'event_date', 'event_time', 
      'event_end_time', 'performance_duration', 'venue', 'venue_address', 'venue_contact_info', 'what3words',
      'gig_type', 'event_type', 'fee', 'final_amount', 'travel_expense', 'deposit_amount', 'equipment_requirements',
      'special_requirements', 'equipment_provided', 'whats_included', 'dress_code', 'styles', 'style_mood',
      'must_play_songs', 'avoid_songs', 'set_order', 'first_dance_song', 'processional_song', 'signing_register_song',
      'recessional_song', 'special_dedications', 'reference_tracks', 'encore_allowed', 'encore_suggestions',
      'contact_phone', 'venue_contact', 'sound_tech_contact', 'stage_size', 'power_equipment', 'sound_check_time',
      'load_in_info', 'parking_info', 'parking_permit_required', 'weather_contingency', 'meal_provided',
      'dietary_requirements', 'guest_announcements', 'photo_permission', 'status', 'workflow_stage',
      'response_needed', 'last_contacted_at', 'has_conflicts', 'completed', 'conflict_count', 'conflict_details',
      'contract_sent', 'contract_signed', 'invoice_sent', 'paid_in_full', 'deposit_paid', 'quoted_amount',
      'uploaded_documents', 'notes', 'shared_notes', 'field_locks', 'collaboration_token',
      'collaboration_token_generated_at', 'distance', 'distance_value', 'duration', 'email_hash',
      'processed_at', 'document_url', 'document_key', 'document_name', 'document_uploaded_at',
      'map_static_url', 'map_latitude', 'map_longitude', 'original_email_content', 'apply_now_link',
      'created_at', 'updated_at'
    ],
    contracts: [
      'id', 'user_id', 'booking_id', 'contract_number', 'client_name', 'client_address', 'client_phone',
      'client_email', 'venue', 'venue_address', 'event_date', 'event_time', 'event_end_time',
      'performance_duration', 'fee', 'deposit', 'deposit_days', 'travel_expenses', 'original_fee',
      'original_travel_expenses', 'payment_instructions', 'equipment_requirements', 'special_requirements',
      'client_fillable_fields', 'status', 'created_at', 'updated_at'
    ],
    invoices: [
      'id', 'user_id', 'booking_id', 'invoice_number', 'client_name', 'client_email', 'client_address',
      'event_date', 'event_location', 'performance_fee', 'travel_expenses', 'total_amount',
      'deposit_amount', 'balance_due', 'payment_terms', 'status', 'due_date', 'paid_date',
      'stripe_payment_intent_id', 'public_url', 'created_at', 'updated_at'
    ]
  };
  
  // Column mappers for each table
  return {
    users: (neonUser: any) => {
      const mapped: any = {};
      
      // Map known columns
      const columnMap = {
        id: 'id',
        email: 'email',
        first_name: 'first_name',
        last_name: 'last_name',
        profile_image_url: 'profile_image_url',
        is_admin: 'is_admin',
        is_assigned: 'is_assigned',
        is_beta_tester: 'is_beta_tester',
        trial_ends_at: 'trial_ends_at',
        has_paid: 'has_paid',
        onboarding_completed: 'onboarding_completed',
        account_notes: 'account_notes',
        stripe_customer_id: 'stripe_customer_id',
        stripe_subscription_id: 'stripe_subscription_id',
        email_prefix: 'email_prefix',
        quick_add_token: 'quick_add_token',
        widget_url: 'widget_url',
        widget_qr_code: 'widget_qr_code',
        phone_number: 'phone_number',
        firebase_uid: 'firebase_uid',
        supabase_uid: 'supabase_uid',
        is_active: 'is_active',
        last_login_at: 'last_login_at',
        last_login_ip: 'last_login_ip',
        login_attempts: 'login_attempts',
        locked_until: 'locked_until',
        created_at: 'created_at',
        updated_at: 'updated_at'
      };
      
      for (const [supabaseCol, neonCol] of Object.entries(columnMap)) {
        if (neonUser[neonCol] !== undefined) {
          mapped[supabaseCol] = neonUser[neonCol];
        }
      }
      
      return mapped;
    },
    
    bookings: (neonBooking: any) => {
      const mapped: any = {};
      
      // Map all compatible columns, skip incompatible ones
      const columnMap = {
        id: 'id',
        user_id: 'user_id',
        client_name: 'client_name',
        client_email: 'client_email',
        client_phone: 'client_phone',
        client_address: 'client_address',
        event_date: 'event_date',
        event_time: 'event_time',
        event_end_time: 'event_end_time',
        performance_duration: 'performance_duration',
        venue: 'venue',
        venue_address: 'venue_address',
        venue_contact_info: 'venue_contact_info',
        what3words: 'what3words',
        gig_type: 'gig_type',
        event_type: 'event_type',
        fee: 'fee',
        final_amount: 'final_amount',
        travel_expense: 'travel_expense',
        deposit_amount: 'deposit_amount',
        equipment_requirements: 'equipment_requirements',
        special_requirements: 'special_requirements',
        equipment_provided: 'equipment_provided',
        whats_included: 'whats_included',
        dress_code: 'dress_code',
        styles: 'styles',
        style_mood: 'style_mood',
        must_play_songs: 'must_play_songs',
        avoid_songs: 'avoid_songs',
        set_order: 'set_order',
        first_dance_song: 'first_dance_song',
        processional_song: 'processional_song',
        signing_register_song: 'signing_register_song',
        recessional_song: 'recessional_song',
        special_dedications: 'special_dedications',
        reference_tracks: 'reference_tracks',
        encore_allowed: 'encore_allowed',
        encore_suggestions: 'encore_suggestions',
        contact_phone: 'contact_phone',
        venue_contact: 'venue_contact',
        sound_tech_contact: 'sound_tech_contact',
        stage_size: 'stage_size',
        power_equipment: 'power_equipment',
        sound_check_time: 'sound_check_time',
        load_in_info: 'load_in_info',
        parking_info: 'parking_info',
        parking_permit_required: 'parking_permit_required',
        weather_contingency: 'weather_contingency',
        meal_provided: 'meal_provided',
        dietary_requirements: 'dietary_requirements',
        guest_announcements: 'guest_announcements',
        photo_permission: 'photo_permission',
        status: 'status',
        workflow_stage: 'workflow_stage',
        response_needed: 'response_needed',
        last_contacted_at: 'last_contacted_at',
        has_conflicts: 'has_conflicts',
        completed: 'completed',
        conflict_count: 'conflict_count',
        conflict_details: 'conflict_details',
        contract_sent: 'contract_sent',
        contract_signed: 'contract_signed',
        invoice_sent: 'invoice_sent',
        paid_in_full: 'paid_in_full',
        deposit_paid: 'deposit_paid',
        quoted_amount: 'quoted_amount',
        uploaded_documents: 'uploaded_documents',
        notes: 'notes',
        shared_notes: 'shared_notes',
        field_locks: 'field_locks',
        collaboration_token: 'collaboration_token',
        collaboration_token_generated_at: 'collaboration_token_generated_at',
        distance: 'distance',
        distance_value: 'distance_value',
        duration: 'duration',
        email_hash: 'email_hash',
        processed_at: 'processed_at',
        document_url: 'document_url',
        document_key: 'document_key',
        document_name: 'document_name',
        document_uploaded_at: 'document_uploaded_at',
        map_static_url: 'map_static_url',
        map_latitude: 'map_latitude',
        map_longitude: 'map_longitude',
        original_email_content: 'original_email_content',
        apply_now_link: 'apply_now_link',
        created_at: 'created_at',
        updated_at: 'updated_at'
      };
      
      for (const [supabaseCol, neonCol] of Object.entries(columnMap)) {
        if (neonBooking[neonCol] !== undefined) {
          mapped[supabaseCol] = neonBooking[neonCol];
        }
      }
      
      // Skip incompatible columns that exist in Neon but not Supabase
      // estimated_value, title, previous_status, uploaded_contract_url, etc. will be omitted
      
      return mapped;
    },
    
    // Generic mapper for other tables - just copy all columns
    generic: (record: any) => ({ ...record })
  };
}

/**
 * Migrate user data to Supabase
 */
async function migrateUserDataToSupabase(userData: Record<string, any[]>, supabaseUserId: string): Promise<MigrationState> {
  log('Starting data migration to Supabase...');
  
  const migrationState: MigrationState = {
    sourceUserId: userData.users[0].id,
    supabaseUserId,
    migratedTables: {},
    errors: [],
  };
  
  const mappers = createColumnMappers();
  
  // Helper function to insert data with error handling
  async function insertData(tableName: string, data: any[], transform?: (item: any) => any) {
    if (data.length === 0) {
      log(`Skipping ${tableName} - no data to migrate`);
      migrationState.migratedTables[tableName] = 0;
      return;
    }
    
    log(`Migrating ${data.length} records to ${tableName}...`);
    
    try {
      for (const item of data) {
        let transformedItem = transform ? transform(item) : { ...item };
        
        // Update user ID to Supabase user ID
        if (transformedItem.user_id === migrationState.sourceUserId) {
          transformedItem.user_id = supabaseUserId;
        }
        
        const { error } = await supabase.from(tableName).insert(transformedItem);
        
        if (error) {
          migrationState.errors.push({
            table: tableName,
            error: error.message,
            data: transformedItem,
          });
          logError(`Failed to insert into ${tableName}:`, error.message);
        }
      }
      
      migrationState.migratedTables[tableName] = data.length - migrationState.errors.filter(e => e.table === tableName).length;
      logSuccess(`Migrated ${migrationState.migratedTables[tableName]} records to ${tableName}`);
      
    } catch (error: any) {
      migrationState.errors.push({
        table: tableName,
        error: error.message,
        data: data,
      });
      logError(`Critical error migrating ${tableName}:`, error.message);
    }
  }
  
  // Migration order (respecting foreign key dependencies)
  
  // 1. Users table (MUST BE FIRST) - update with Supabase UID
  await insertData('users', userData.users, (user) => {
    const mapped = mappers.users(user);
    return {
      ...mapped,
      id: supabaseUserId, // Use Supabase UUID as primary key
      supabase_uid: supabaseUserId, // Link to Supabase Auth
    };
  });
  
  // 2. User-related tables (can only be inserted after user exists)
  await insertData('security_monitoring', userData.securityMonitoring, mappers.generic);
  await insertData('user_security_status', userData.userSecurityStatus, mappers.generic);
  await insertData('user_activity', userData.userActivity, mappers.generic);
  await insertData('user_login_history', userData.userLoginHistory, mappers.generic);
  await insertData('user_messages', userData.userMessages, mappers.generic);
  await insertData('support_tickets', userData.supportTickets, mappers.generic);
  await insertData('user_audit_logs', userData.userAuditLogs, mappers.generic);
  await insertData('blocked_dates', userData.blockedDates, mappers.generic);
  await insertData('phone_verifications', userData.phoneVerifications, mappers.generic);
  await insertData('sms_verifications', userData.smsVerifications, mappers.generic);
  
  // 3. Bookings (must be after user)
  await insertData('bookings', userData.bookings, mappers.bookings);
  
  // 4. Contracts and Invoices (depend on user and bookings)
  await insertData('contracts', userData.contracts, mappers.generic);
  await insertData('invoices', userData.invoices, mappers.generic);
  
  // 5. Documents and communications (depend on bookings)
  await insertData('booking_documents', userData.bookingDocuments, mappers.generic);
  await insertData('client_communications', userData.clientCommunications, mappers.generic);
  await insertData('compliance_documents', userData.complianceDocuments, mappers.generic);
  await insertData('compliance_sent_log', userData.complianceSentLog, mappers.generic);
  await insertData('message_notifications', userData.messageNotifications, mappers.generic);
  
  return migrationState;
}

/**
 * Copy R2 documents (stub - would need R2 API access)
 */
async function copyR2Documents(userData: Record<string, any[]>): Promise<void> {
  log('Scanning for R2 document references...');
  
  const r2References: string[] = [];
  
  // Scan all tables for R2 document keys
  for (const [tableName, records] of Object.entries(userData)) {
    for (const record of records) {
      // Look for fields that might contain R2 keys
      const r2Fields = ['documentKey', 'document_key', 'storageKey', 'storage_key', 'fileKey', 'file_key'];
      
      for (const field of r2Fields) {
        if (record[field] && typeof record[field] === 'string' && record[field].includes('/')) {
          r2References.push(record[field]);
        }
      }
      
      // Also check JSON fields that might contain document arrays
      if (record.uploadedDocuments && Array.isArray(record.uploadedDocuments)) {
        for (const doc of record.uploadedDocuments) {
          if (doc.key) {
            r2References.push(doc.key);
          }
        }
      }
    }
  }
  
  const uniqueR2References = [...new Set(r2References)];
  
  if (uniqueR2References.length > 0) {
    log(`Found ${uniqueR2References.length} R2 document references:`);
    uniqueR2References.forEach(ref => log(`  - ${ref}`));
    log(`⚠️  NOTE: R2 document copying not implemented in this script.`);
    log(`⚠️  You will need to manually copy these documents or implement R2 API access.`);
  } else {
    log('No R2 document references found');
  }
}

/**
 * Update Supabase sequences
 */
async function updateSupabaseSequences(userData: Record<string, any[]>): Promise<void> {
  log('Updating Supabase database sequences...');
  
  const sequenceUpdates = [];
  
  // Find maximum IDs for tables with serial primary keys
  const tablesWithSerialIds = [
    'bookings', 'contracts', 'invoices', 'booking_documents', 
    'client_communications', 'compliance_documents', 'compliance_sent_log',
    'message_notifications', 'support_tickets', 'user_audit_logs',
    'blocked_dates', 'trial_usage_tracking', 'security_monitoring',
    'user_security_status', 'user_activity', 'user_login_history',
    'user_messages', 'phone_verifications', 'sms_verifications'
  ];
  
  for (const tableName of tablesWithSerialIds) {
    if (userData[tableName] && userData[tableName].length > 0) {
      const maxId = Math.max(...userData[tableName].map(record => record.id || 0));
      if (maxId > 0) {
        sequenceUpdates.push({
          table: tableName,
          sequence: `${tableName}_id_seq`,
          maxId,
        });
      }
    }
  }
  
  if (sequenceUpdates.length > 0) {
    for (const update of sequenceUpdates) {
      try {
        // Use raw SQL to update sequence
        const { error } = await supabase.rpc('update_sequence', {
          sequence_name: update.sequence,
          new_value: update.maxId + 1,
        });
        
        if (error) {
          // Try alternative approach with direct SQL
          const sql = `SELECT setval('${update.sequence}', ${update.maxId + 1}, true)`;
          log(`⚠️  Manual sequence update needed: ${sql}`);
        } else {
          logSuccess(`Updated sequence ${update.sequence} to ${update.maxId + 1}`);
        }
      } catch (error: any) {
        logError(`Failed to update sequence ${update.sequence}:`, error.message);
        log(`⚠️  Manual sequence update needed: SELECT setval('${update.sequence}', ${update.maxId + 1}, true);`);
      }
    }
  } else {
    log('No sequence updates needed');
  }
}

/**
 * Verify migration integrity
 */
async function verifyMigration(migrationState: MigrationState, userData: Record<string, any[]>): Promise<void> {
  log('Verifying migration integrity...');
  
  // Check user exists in Supabase
  const { data: supabaseUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', migrationState.supabaseUserId)
    .single();
  
  if (userError || !supabaseUser) {
    logError('User not found in Supabase after migration');
    return;
  }
  
  logSuccess(`User verified in Supabase:`, { id: supabaseUser.id, email: supabaseUser.email });
  
  // Verify record counts
  log('\n📊 Migration Summary:');
  log('─'.repeat(50));
  
  let totalSourceRecords = 0;
  let totalMigratedRecords = 0;
  let totalErrors = 0;
  
  for (const [tableName, sourceRecords] of Object.entries(userData)) {
    const sourceCount = sourceRecords.length;
    const migratedCount = migrationState.migratedTables[tableName] || 0;
    const errorCount = migrationState.errors.filter(e => e.table === tableName).length;
    
    totalSourceRecords += sourceCount;
    totalMigratedRecords += migratedCount;
    totalErrors += errorCount;
    
    const status = sourceCount === migratedCount ? '✅' : sourceCount === 0 ? '⭕' : '❌';
    log(`${status} ${tableName.padEnd(25)} ${sourceCount.toString().padStart(4)} → ${migratedCount.toString().padStart(4)} (${errorCount} errors)`);
  }
  
  log('─'.repeat(50));
  log(`📊 Total: ${totalSourceRecords} → ${totalMigratedRecords} (${totalErrors} errors)`);
  
  // Show errors if any
  if (migrationState.errors.length > 0) {
    log('\n❌ Migration Errors:');
    migrationState.errors.forEach((error, index) => {
      log(`${index + 1}. ${error.table}: ${error.error}`);
    });
  }
  
  // Verify some key relationships
  log('\n🔗 Relationship Verification:');
  
  try {
    // Check bookings count
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('count')
      .eq('user_id', migrationState.supabaseUserId);
    
    if (!bookingsError) {
      log(`✅ Bookings: ${bookings?.length || 0} found for user`);
    }
    
    // Check contracts count
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('count')
      .eq('user_id', migrationState.supabaseUserId);
    
    if (!contractsError) {
      log(`✅ Contracts: ${contracts?.length || 0} found for user`);
    }
    
    // Check invoices count
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('count')
      .eq('user_id', migrationState.supabaseUserId);
    
    if (!invoicesError) {
      log(`✅ Invoices: ${invoices?.length || 0} found for user`);
    }
    
  } catch (error: any) {
    log(`⚠️  Could not verify relationships: ${error.message}`);
  }
}

/**
 * Main migration function
 */
async function main(): Promise<void> {
  log(`🚀 Starting comprehensive user migration for: ${TARGET_EMAIL}`);
  log(`🔄 Migration from Neon to Supabase Production`);
  
  try {
    // Step 1: Test connections
    await testConnections();
    
    // Step 2: Find user in Neon
    const sourceUser = await findUserInNeon(TARGET_EMAIL);
    
    // Step 3: Create Supabase Auth user
    const supabaseUserId = await createSupabaseAuthUser(sourceUser);
    
    // Step 4: Extract all user data from Neon
    const userData = await extractUserData(sourceUser.id);
    
    // Step 5: Migrate data to Supabase
    const migrationState = await migrateUserDataToSupabase(userData, supabaseUserId);
    
    // Step 6: Copy R2 documents (scan only)
    await copyR2Documents(userData);
    
    // Step 7: Update sequences
    await updateSupabaseSequences(userData);
    
    // Step 8: Verify migration
    await verifyMigration(migrationState, userData);
    
    logSuccess('🎉 Migration completed successfully!');
    
    log('\n📋 Next Steps:');
    log('1. User needs to reset their password using Supabase Auth');
    log('2. Test user login and functionality');
    log('3. Copy any R2 documents if needed');
    log('4. Verify all features work correctly');
    
  } catch (error: any) {
    logError('💥 Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Clean up connections
    await neonPool.end();
  }
}

// Execute migration when run directly
main().catch(console.error);