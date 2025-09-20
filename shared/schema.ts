import { pgTable, text, varchar, timestamp, jsonb, index, serial, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with snake_case columns, camelCase TypeScript properties via Drizzle mapping
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),           // Physical: first_name, TS: firstName
  lastName: varchar("last_name"),             // Physical: last_name, TS: lastName
  profileImageUrl: varchar("profile_image_url"), // Physical: profile_image_url, TS: profileImageUrl
  
  // User Type (simplified booleans)
  isAdmin: boolean("is_admin").default(false),
  isAssigned: boolean("is_assigned").default(false),
  isBetaTester: boolean("is_beta_tester").default(false),
  
  // Email verification
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),

  // User tier
  tier: varchar("tier", { length: 50 }).default("free"),
  
  // Access Control
  trialEndsAt: timestamp("trial_ends_at").default(null),
  hasPaid: boolean("has_paid").default(false),
  
  // Onboarding
  onboardingCompleted: boolean("onboarding_completed").default(false),
  
  // Notes
  accountNotes: text("account_notes").default(null),
  
  // Stripe Integration
  stripeCustomerId: text("stripe_customer_id").default(null),
  stripeSubscriptionId: text("stripe_subscription_id").default(null),
  
  // Widget fields
  emailPrefix: text("email_prefix").unique(),
  quickAddToken: text("quick_add_token").unique(),
  widgetUrl: text("widget_url"),
  widgetQrCode: text("widget_qr_code"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  
  // Auth Integration
  supabaseUid: text("supabase_uid").unique(),
  firebaseUid: text("firebase_uid").unique(),
  
  // Status fields
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIP: varchar("last_login_ip"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  
  // Timestamps - consistent snake_case
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SMS Verification table - secure database storage instead of in-memory Map
export const smsVerifications = pgTable("sms_verifications", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  password: varchar("password").notNull(), // Hashed password
  verificationCode: varchar("verification_code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Security Monitoring - Track usage for spam/abuse protection (not artificial limits)
export const securityMonitoring = pgTable("security_monitoring", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  apiService: varchar("api_service", { length: 50 }).notNull(), // 'openai', 'claude', 'googlemaps', etc.
  endpoint: varchar("endpoint", { length: 100 }), // specific endpoint called
  requestCount: integer("request_count").default(1), // number of requests in this entry
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 6 }).default("0"), // cost in USD
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  suspicious: boolean("suspicious").default(false), // flagged as potential abuse
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_security_user_service").on(table.userId, table.apiService),
  index("idx_security_created_at").on(table.createdAt),
  index("idx_security_suspicious").on(table.suspicious),
]);

// User Security Status - For blocking abusive users
export const userSecurityStatus = pgTable("user_security_status", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  isBlocked: boolean("is_blocked").default(false),
  blockReason: text("block_reason"),
  riskScore: integer("risk_score").default(0), // 0-100 risk assessment
  lastReviewAt: timestamp("last_review_at"),
  blockedAt: timestamp("blocked_at"),
  blockedBy: varchar("blocked_by"), // admin user id who blocked
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User activity tracking table
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar("action").notNull(), // login, logout, page_view, feature_used
  details: jsonb("details"), // Additional action details
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User login history table
export const userLoginHistory = pgTable("user_login_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  loginTime: timestamp("login_time").defaultNow(),
  logoutTime: timestamp("logout_time"),
  sessionDuration: integer("session_duration"), // in minutes
  successful: boolean("successful").default(true),
  failureReason: varchar("failure_reason"),
});

// User messages/announcements table
export const userMessages = pgTable("user_messages", {
  id: serial("id").primaryKey(),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  toUserId: varchar("to_user_id").references(() => users.id, { onDelete: 'cascade' }), // Null for broadcast messages
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  type: varchar("type").notNull().default("announcement"), // announcement, message, alert
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  assignedToUserId: varchar("assigned_to_user_id").references(() => users.id), // Admin assigned to handle
  subject: varchar("subject").notNull(),
  description: text("description").notNull(),
  category: varchar("category").default("general"), // general, technical, billing, feature
  priority: varchar("priority").default("medium"), // low, medium, high, urgent
  status: varchar("status").default("open"), // open, in_progress, resolved, closed
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// User audit logs table
export const userAuditLogs = pgTable("user_audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  adminUserId: varchar("admin_user_id").references(() => users.id), // Admin who made the change
  action: varchar("action").notNull(), // created, updated, deleted, suspended, etc.
  entityType: varchar("entity_type"), // user, booking, contract, etc.
  entityId: varchar("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  reason: text("reason"),
  ipAddress: varchar("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blocked dates table - for holidays, personal time, unavailable dates
export const blockedDates = pgTable("blocked_dates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(), // Support date ranges
  title: varchar("title", { length: 100 }).notNull(), // "Holiday", "Personal Time", etc.
  description: text("description"), // Optional details
  isRecurring: boolean("is_recurring").default(false), // For annual holidays
  recurrencePattern: varchar("recurrence_pattern"), // "yearly", "monthly", etc.
  color: varchar("color", { length: 7 }).default("#ef4444"), // Hex color for calendar display
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_blocked_dates_user").on(table.userId),
  index("idx_blocked_dates_range").on(table.startDate, table.endDate),
]);

// Phone verification tracking
export const phoneVerifications = pgTable("phone_verifications", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  verificationCode: varchar("verification_code", { length: 6 }),
  verifiedAt: timestamp("verified_at"),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
});

// Fraud prevention log
export const fraudPreventionLog = pgTable("fraud_prevention_log", {
  id: serial("id").primaryKey(),
  phoneNumber: varchar("phone_number", { length: 20 }),
  emailAddress: varchar("email_address"),
  ipAddress: varchar("ip_address"),
  deviceFingerprint: text("device_fingerprint"),
  actionTaken: varchar("action_taken", { length: 100 }),
  reason: text("reason"),
  riskScore: integer("risk_score"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trial usage tracking
export const trialUsageTracking = pgTable("trial_usage_tracking", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  featureUsed: varchar("feature_used", { length: 100 }),
  usageCount: integer("usage_count").default(1),
  lastUsed: timestamp("last_used").defaultNow(),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bands table for organizing bookings by band/project with custom colors
export const bands = pgTable("bands", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 7 }).notNull(), // Hex color code
  isDefault: boolean("is_default").default(false),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_bands_user_id").on(table.userId),
]);

// Bookings table with snake_case columns, camelCase TypeScript properties via Drizzle mapping
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Client Information - snake_case columns, camelCase TS properties
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email"),
  clientPhone: varchar("client_phone"),
  clientAddress: text("client_address"),
  
  // Event Details
  eventDate: timestamp("event_date"),
  eventTime: varchar("event_time"),
  eventEndTime: varchar("event_end_time"),
  performanceDuration: text("performance_duration"),
  
  // Venue Information
  venue: varchar("venue"),
  venueAddress: text("venue_address"),
  venueContactInfo: text("venue_contact_info"),
  what3words: varchar("what3words"),
  
  // Event Classification
  gigType: varchar("gig_type"),
  eventType: varchar("event_type"),
  bandId: integer("band_id").references(() => bands.id, { onDelete: 'set null' }),

  // Financial Information
  fee: decimal("fee", { precision: 10, scale: 2 }),
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }),
  travelExpense: decimal("travel_expense", { precision: 10, scale: 2 }).default("0.00"),
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }),
  
  // Requirements
  equipmentRequirements: text("equipment_requirements"),
  specialRequirements: text("special_requirements"),
  equipmentProvided: text("equipment_provided"),
  whatsIncluded: text("whats_included"),
  dressCode: varchar("dress_code"),
  
  // Music Details
  styles: text("styles"),
  styleMood: varchar("style_mood"),
  mustPlaySongs: text("must_play_songs"),
  avoidSongs: text("avoid_songs"),
  setOrder: varchar("set_order"),
  firstDanceSong: varchar("first_dance_song"),
  processionalSong: varchar("processional_song"),
  signingRegisterSong: varchar("signing_register_song"),
  recessionalSong: varchar("recessional_song"),
  specialDedications: text("special_dedications"),
  referenceTracks: text("reference_tracks"),
  encoreAllowed: boolean("encore_allowed").default(false),
  encoreSuggestions: text("encore_suggestions"),
  
  // Contact Information
  contactPhone: varchar("contact_phone"),
  venueContact: text("venue_contact"),
  soundTechContact: text("sound_tech_contact"),
  
  // Technical Details
  stageSize: varchar("stage_size"),
  powerEquipment: text("power_equipment"),
  soundCheckTime: text("sound_check_time"),
  loadInInfo: text("load_in_info"),
  
  // Logistics
  parkingInfo: text("parking_info"),
  parkingPermitRequired: boolean("parking_permit_required").default(false),
  weatherContingency: text("weather_contingency"),
  mealProvided: boolean("meal_provided").default(false),
  dietaryRequirements: text("dietary_requirements"),
  
  // Guest Services
  guestAnnouncements: text("guest_announcements"),
  photoPermission: boolean("photo_permission").default(false),
  
  // Workflow Management
  status: varchar("status").notNull().default("new"),
  workflowStage: varchar("workflow_stage").notNull().default("initial"),
  responseNeeded: boolean("response_needed").default(true),
  lastContactedAt: timestamp("last_contacted_at"),
  hasConflicts: boolean("has_conflicts").default(false),
  
  // Progress Tracking
  completed: boolean("completed").default(false),
  conflictCount: integer("conflict_count").default(0),
  conflictDetails: text("conflict_details"),
  
  // Contract/Invoice Status
  contractSent: boolean("contract_sent").default(false),
  contractSigned: boolean("contract_signed").default(false),
  invoiceSent: boolean("invoice_sent").default(false),
  paidInFull: boolean("paid_in_full").default(false),
  depositPaid: boolean("deposit_paid").default(false),
  
  // Additional Financial Fields
  quotedAmount: decimal("quoted_amount", { precision: 10, scale: 2 }),
  
  // Document Storage
  uploadedDocuments: jsonb("uploaded_documents").default('[]'),
  
  // Additional Notes
  notes: text("notes"),
  sharedNotes: text("shared_notes"),
  
  // Collaboration
  fieldLocks: jsonb("field_locks").default('{}'),
  collaborationToken: varchar("collaboration_token").unique(),
  collaborationTokenGeneratedAt: timestamp("collaboration_token_generated_at"),
  
  // Mileage calculation
  distance: text("distance"),
  distanceValue: integer("distance_value"),
  duration: text("duration"),
  
  // Email processing
  emailHash: varchar("email_hash").unique(),
  processedAt: timestamp("processed_at"),
  
  // Legacy document fields (for migration)
  documentUrl: text("document_url"),
  documentKey: text("document_key"),
  documentName: text("document_name"),
  documentUploadedAt: timestamp("document_uploaded_at"),
  
  // Map data caching
  mapStaticUrl: text("map_static_url"),
  mapLatitude: decimal("map_latitude", { precision: 10, scale: 7 }),
  mapLongitude: decimal("map_longitude", { precision: 10, scale: 7 }),
  
  // Email tracking
  originalEmailContent: text("original_email_content"),
  applyNowLink: varchar("apply_now_link"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contracts table with snake_case columns, camelCase TypeScript properties via Drizzle mapping
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  enquiryId: integer("enquiry_id").references(() => bookings.id), // FK to booking (enquiry)
  contractNumber: varchar("contract_number").notNull().unique(),
  
  // Client Information
  clientName: varchar("client_name").notNull(),
  clientAddress: text("client_address"),
  clientPhone: varchar("client_phone"),
  clientEmail: varchar("client_email"),
  
  // Event Details
  venue: varchar("venue"),
  venueAddress: text("venue_address"),
  eventDate: timestamp("event_date").notNull(),
  eventTime: varchar("event_time"),
  eventEndTime: varchar("event_end_time"),
  performanceDuration: varchar("performance_duration"),
  
  // Financial
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  deposit: decimal("deposit", { precision: 10, scale: 2 }).default("0.00"),
  depositDays: integer("deposit_days").default(7),
  travelExpenses: varchar("travel_expenses"),
  
  // Essential rider/payment information
  paymentInstructions: text("payment_instructions"), // How payment should be made
  equipmentRequirements: text("equipment_requirements"), // Equipment needed from venue
  specialRequirements: text("special_requirements"), // Any special rider requirements
  
  // Client-fillable field tracking
  clientFillableFields: text("client_fillable_fields"), // JSON array of field names that client must fill
  
  // Contract management
  status: varchar("status").notNull().default("draft"), // draft, sent, signed, completed, superseded
  template: varchar("template").notNull().default("professional"), // basic, professional
  signedAt: timestamp("signed_at"),
  
  // Amendment tracking
  supersededBy: integer("superseded_by"), // ID of the contract that superseded this one
  originalContractId: integer("original_contract_id"), // For amended contracts, points to the original
  
  // Cloud storage for documents and signing pages
  cloudStorageUrl: text("cloud_storage_url"), // URL for contract PDF
  cloudStorageKey: text("cloud_storage_key"), // Storage key for contract PDF
  signingPageUrl: text("signing_page_url"), // URL for cloud-hosted signing page
  signingPageKey: text("signing_page_key"), // Storage key for signing page
  signingUrlCreatedAt: timestamp("signing_url_created_at"), // Track when URL was generated
  
  // Signature tracking fields
  clientSignature: text("client_signature"), // Client's actual signature data
  clientIpAddress: varchar("client_ip_address"), // IP address when client signed
  
  // Collaborative event planning fields
  venueContact: text("venue_contact"),
  soundTechContact: text("sound_tech_contact"),
  stageSize: varchar("stage_size", { length: 50 }),
  powerEquipment: text("power_equipment"),
  dressCode: varchar("dress_code", { length: 255 }),
  styleMood: varchar("style_mood", { length: 50 }),
  mustPlaySongs: text("must_play_songs"),
  avoidSongs: text("avoid_songs"),
  setOrder: varchar("set_order", { length: 50 }),
  firstDanceSong: varchar("first_dance_song", { length: 255 }),
  processionalSong: varchar("processional_song", { length: 255 }),
  signingRegisterSong: varchar("signing_register_song", { length: 255 }),
  recessionalSong: varchar("recessional_song", { length: 255 }),
  specialDedications: text("special_dedications"),
  guestAnnouncements: text("guest_announcements"),
  loadInInfo: text("load_in_info"),
  soundCheckTime: varchar("sound_check_time", { length: 50 }),
  weatherContingency: text("weather_contingency"),
  parkingPermitRequired: boolean("parking_permit_required").default(false),
  mealProvided: boolean("meal_provided").default(false),
  dietaryRequirements: text("dietary_requirements"),
  sharedNotes: text("shared_notes"),
  referenceTracks: text("reference_tracks"),
  photoPermission: boolean("photo_permission").default(false),
  encoreAllowed: boolean("encore_allowed").default(false),
  encoreSuggestions: varchar("encore_suggestions", { length: 255 }),
  
  // Client portal access (collaborative booking form)
  clientPortalUrl: text("client_portal_url"), // URL for client to access collaborative booking form
  clientPortalToken: text("client_portal_token"), // Secure token for client portal access
  clientPortalQrCode: text("client_portal_qr_code"), // Base64 QR code for client portal
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table with snake_case columns, camelCase TypeScript properties via Drizzle mapping
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  contractId: integer("contract_id").references(() => contracts.id),
  bookingId: integer("booking_id").references(() => bookings.id),
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  
  // Client Information
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email"),
  ccEmail: varchar("cc_email"),
  clientAddress: varchar("client_address"),
  venueAddress: text("venue_address"),
  
  // Event Information
  eventDate: timestamp("event_date"),
  fee: varchar("fee"),
  performanceDuration: text("performance_duration"),
  gigType: text("gig_type"),
  
  // Invoice Details
  invoiceType: varchar("invoice_type").notNull().default("performance"),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  depositPaid: decimal("deposit_paid", { precision: 10, scale: 2 }).default("0"),
  dueDate: timestamp("due_date").notNull(),
  
  // Status tracking
  status: varchar("status").notNull().default("draft"),
  paidAt: timestamp("paid_at"),
  
  // Cloud Storage
  cloudStorageUrl: text("cloud_storage_url"),
  cloudStorageKey: text("cloud_storage_key"),
  shareToken: varchar("share_token").notNull(),
  
  // Stripe Integration
  stripePaymentLinkId: text("stripe_payment_link_id"),
  stripePaymentUrl: text("stripe_payment_url"),
  stripeSessionId: text("stripe_session_id"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Booking documents table - supports multiple documents per booking
export const bookingDocuments = pgTable("booking_documents", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // For security - ensure user owns the booking
  documentType: varchar("document_type").notNull().default("other"), // contract, invoice, other
  documentName: varchar("document_name").notNull(), // Original filename
  documentUrl: text("document_url").notNull(), // URL to document in R2
  documentKey: text("document_key").notNull(), // Storage key in R2
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => [
  index("idx_booking_documents_booking").on(table.bookingId),
  index("idx_booking_documents_user").on(table.userId),
]);

// Client communication history table - tracks all emails/messages sent to clients
export const clientCommunications = pgTable("client_communications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // User who sent the communication
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: 'cascade' }), // Optional - communication may not be linked to a specific booking
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email").notNull(),
  communicationType: varchar("communication_type").notNull().default("email"), // email, sms, phone_call
  direction: varchar("direction").notNull().default("outbound"), // outbound, inbound
  templateId: integer("template_id"), // Optional - if sent using a template
  templateName: varchar("template_name"), // Name of template used
  templateCategory: varchar("template_category"), // Category of template used
  subject: text("subject"), // Email subject
  messageBody: text("message_body").notNull(), // Email/SMS content or R2 URL for cloud-stored content
  attachments: jsonb("attachments").default('[]'), // Array of attachment info {name, url, type}
  mailgunMessageId: varchar("mailgun_message_id"), // Mailgun message ID for tracking delivery status
  sentAt: timestamp("sent_at").defaultNow(),
  deliveryStatus: varchar("delivery_status").default("sent"), // sent, delivered, failed, bounced
  openedAt: timestamp("opened_at"), // When email was opened (if tracking available)
  repliedAt: timestamp("replied_at"), // When client replied
  notes: text("notes"), // Additional notes about this communication
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_client_communications_user").on(table.userId),
  index("idx_client_communications_booking").on(table.bookingId),
  index("idx_client_communications_client_email").on(table.clientEmail),
  index("idx_client_communications_sent_at").on(table.sentAt),
]);

// Compliance documents table
export const complianceDocuments = pgTable("compliance_documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type").notNull(), // public_liability, pat_testing, music_license
  name: varchar("name").notNull(),
  expiryDate: timestamp("expiry_date"),
  status: varchar("status").notNull().default("valid"), // valid, expiring, expired
  documentUrl: varchar("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Settings table with snake_case columns, camelCase TypeScript properties via Drizzle mapping
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  
  // Business Information
  businessName: varchar("business_name"),
  businessContactEmail: varchar("business_contact_email"),
  addressLine1: varchar("address_line1"),
  addressLine2: varchar("address_line2"),
  city: varchar("city"),
  county: varchar("county"),
  postcode: varchar("postcode"),
  
  // Home Address
  homeAddressLine1: varchar("home_address_line1"),
  homeAddressLine2: varchar("home_address_line2"),
  homeCity: varchar("home_city"),
  homePostcode: varchar("home_postcode"),
  
  // Contact Information
  phone: varchar("phone"),
  website: varchar("website"),
  taxNumber: varchar("tax_number"),
  bankDetails: text("bank_details"),
  
  // Contract Settings
  contractClauses: jsonb("contract_clauses").default('{}'),
  customClauses: jsonb("custom_clauses").default('[]'),
  emailFromName: varchar("email_from_name"),
  invoicePrefix: varchar("invoice_prefix"),
  nextInvoiceNumber: integer("next_invoice_number").default(1),
  
  // Display Settings
  bookingDisplayLimit: varchar("booking_display_limit").default("50"),
  
  // Instrument Settings
  primaryInstrument: varchar("primary_instrument"),
  secondaryInstruments: jsonb("secondary_instruments").default('[]'),
  gigTypes: text("gig_types"),
  customGigTypes: text("custom_gig_types"),
  
  // Theme Settings
  themeAccentColor: varchar("theme_accent_color").default("#673ab7"),
  themeShowTerms: boolean("theme_show_terms").default(true),

  // Band Settings
  bandsConfig: jsonb("bands_config").default('[]'),
  defaultBandId: integer("default_band_id").references(() => bands.id, { onDelete: 'set null' }),
  showBandColors: boolean("show_band_colors").default(true),

  // Email Settings
  emailSignatureText: text("email_signature_text"),
  
  // Invoice Settings
  invoicePaymentTerms: varchar("invoice_payment_terms").default("7_days_after"),
  invoiceClauses: jsonb("invoice_clauses").default('{}'),
  customInvoiceClauses: jsonb("custom_invoice_clauses").default('[]'),
  
  // Preferences
  distanceUnits: varchar("distance_units").default("miles"),
  
  // AI Pricing
  aiPricingEnabled: boolean("ai_pricing_enabled").default(true),
  baseHourlyRate: decimal("base_hourly_rate", { precision: 10, scale: 2 }).default("130.00"),
  minimumBookingHours: decimal("minimum_booking_hours", { precision: 3, scale: 1 }).default("2.0"),
  additionalHourRate: decimal("additional_hour_rate", { precision: 10, scale: 2 }).default("60.00"),
  djServiceRate: decimal("dj_service_rate", { precision: 10, scale: 2 }).default("300.00"),
  travelSurchargeEnabled: boolean("travel_surcharge_enabled").default(false),
  localTravelRadius: integer("local_travel_radius").default(20),
  customPricingPackages: jsonb("custom_pricing_packages").default('[]'),
  pricingNotes: text("pricing_notes"),
  specialOffers: text("special_offers"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Google Calendar Integration
export const googleCalendarIntegration = pgTable("google_calendar_integration", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  googleRefreshToken: text("google_refresh_token").notNull(),
  googleCalendarId: varchar("google_calendar_id").default("primary"),
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  syncToken: text("sync_token"), // For incremental sync
  webhookChannelId: varchar("webhook_channel_id"), // For real-time updates
  webhookExpiration: timestamp("webhook_expiration"),
  autoSyncBookings: boolean("auto_sync_bookings").default(true), // Sync MusoBuddy → Google
  autoImportEvents: boolean("auto_import_events").default(false), // Sync Google → MusoBuddy
  syncDirection: varchar("sync_direction").default("bidirectional"), // bidirectional, export_only, import_only
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Sync Mapping (tracks which events are synced between systems)
export const eventSyncMapping = pgTable("event_sync_mapping", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  musobuddyId: integer("musobuddy_id"), // MusoBuddy booking ID
  musobuddyType: varchar("musobuddy_type").notNull(), // 'booking', 'contract', etc.
  googleEventId: varchar("google_event_id").notNull(),
  googleCalendarId: varchar("google_calendar_id").default("primary"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
  syncDirection: varchar("sync_direction").notNull(), // 'musoBuddy_to_google', 'google_to_musoBuddy', 'bidirectional'
  conflictStatus: varchar("conflict_status"), // null, 'resolved', 'pending'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email templates table for custom responses
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(), // "Decline Enquiry", "Request More Info", etc.
  category: varchar("category").default("general"), // "booking", "contract", "invoice", "marketing", "follow-up", "general"
  subject: varchar("subject").notNull(),
  emailBody: text("email_body").notNull(),
  smsBody: text("sms_body"),
  isDefault: boolean("is_default").default(false),
  isAutoRespond: boolean("is_auto_respond").default(false), // Show in auto-respond options
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conflict resolutions table - tracks when soft conflicts have been manually resolved
export const conflictResolutions = pgTable("conflict_resolutions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookingIds: text("booking_ids").notNull(), // JSON array of booking IDs in the conflict group
  conflictDate: timestamp("conflict_date").notNull(), // Date when the conflict occurs
  resolvedAt: timestamp("resolved_at").defaultNow(),
  resolvedBy: varchar("resolved_by").notNull(), // User who resolved the conflict
  notes: text("notes"), // Optional notes about the resolution
  createdAt: timestamp("created_at").defaultNow(),
});

// Client management table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  notes: text("notes"),
  totalBookings: integer("total_bookings").default(0),
  totalRevenue: decimal("total_revenue", { precision: 10, scale: 2 }).default("0.00"),
  bookingIds: text("booking_ids"), // JSON array of associated booking IDs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Instrument gig type mappings table - stores AI-generated mappings to avoid repeated calls
export const instrumentMappings = pgTable("instrument_mappings", {
  id: serial("id").primaryKey(),
  instrument: varchar("instrument").notNull().unique(), // lowercase instrument name
  gigTypes: text("gig_types").notNull(), // JSON array of gig types
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Booking conflicts table
export const bookingConflicts = pgTable("booking_conflicts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  enquiryId: integer("enquiry_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  conflictingId: integer("conflicting_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }), // ID of conflicting enquiry/booking
  conflictType: varchar("conflict_type").notNull(), // 'enquiry', 'contract', 'booking'
  conflictDate: timestamp("conflict_date").notNull(),
  severity: varchar("severity").notNull(), // 'critical', 'warning', 'manageable'
  travelTime: integer("travel_time"), // minutes between venues
  distance: decimal("distance", { precision: 5, scale: 2 }), // miles
  timeGap: integer("time_gap"), // minutes between bookings
  isResolved: boolean("is_resolved").default(false),
  resolution: varchar("resolution"), // 'accepted_both', 'declined_new', 'rescheduled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Beta tester feedback table - restricted access for beta testers only
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar("type").notNull(), // 'bug', 'feature', 'improvement', 'other'
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  priority: varchar("priority").default("medium"), // 'low', 'medium', 'high', 'critical'
  status: varchar("status").default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  page: varchar("page"), // Page where feedback was submitted
  adminNotes: text("admin_notes"), // Admin-only notes
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unparseable messages table - stores messages that AI couldn't parse
export const unparseableMessages = pgTable("unparseable_messages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  source: varchar("source").notNull(), // 'widget', 'email', 'manual'
  fromContact: varchar("from_contact"), // Email, phone, or name of sender
  subject: varchar("subject"), // Email subject line for matching to bookings
  rawMessage: text("raw_message").notNull(), // The original unparsed message
  clientAddress: text("client_address"), // Optional address if provided
  parsingErrorDetails: text("parsing_error_details"), // Why AI couldn't parse it
  messageType: varchar("message_type").default("general"), // 'general', 'price_enquiry', 'vague'
  status: varchar("status").default("pending"), // 'pending', 'reviewed', 'converted', 'discarded'
  reviewNotes: text("review_notes"), // User notes from manual review
  convertedToBookingId: integer("converted_to_booking_id").references(() => bookings.id), // If manually converted to booking
  createdAt: timestamp("created_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Message notifications table - for client replies to booking emails
export const messageNotifications = pgTable("message_notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  senderEmail: varchar("sender_email").notNull(),
  subject: varchar("subject").notNull(),
  messageUrl: text("message_url").notNull(), // Cloud storage URL for the message content
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false), // Track if notification has been viewed and should be hidden
  createdAt: timestamp("created_at").defaultNow(),
});

// Beta invite management table (email-based invites)
export const betaInvites = pgTable("beta_invites", {
  email: varchar("email").primaryKey(),
  status: varchar("status").default("pending"), // pending, used, expired
  invitedBy: varchar("invited_by").notNull().references(() => users.id), // Admin user ID who sent invite
  invitedAt: timestamp("invited_at").defaultNow(),
  usedAt: timestamp("used_at"),
  usedBy: varchar("used_by").references(() => users.id), // User ID who used the invite
  notes: text("notes"), // Internal notes about the invite
  cohort: varchar("cohort").default("2025_beta"), // Beta cohort identifier
});

// Dynamic beta invite codes table
export const betaInviteCodes = pgTable("beta_invite_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).unique().notNull(), // e.g. BETA-X7K9-2025
  status: varchar("status").default("active"), // active, disabled, expired
  maxUses: integer("max_uses").default(1), // How many times this code can be used
  currentUses: integer("current_uses").default(0), // How many times it's been used
  trialDays: integer("trial_days").default(365), // How many trial days to grant
  description: text("description"), // Admin notes about this code
  createdBy: varchar("created_by").notNull().references(() => users.id), // Admin user ID who created it
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiry date
  lastUsedAt: timestamp("last_used_at"),
  lastUsedBy: varchar("last_used_by").references(() => users.id), // Last user ID who used it
});

// Contract Learning System Tables

// Store imported contract files
export const importedContracts = pgTable("imported_contracts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: varchar("filename").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  cloudStorageUrl: varchar("cloud_storage_url"),
  cloudStorageKey: varchar("cloud_storage_key"),
  contractType: varchar("contract_type"), // 'musicians_union', 'custom', etc.
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  bookingId: integer("booking_id").references(() => bookings.id),
});

// Store extraction patterns (the learning component)
export const contractExtractionPatterns = pgTable("contract_extraction_patterns", {
  id: serial("id").primaryKey(),
  contractType: varchar("contract_type").notNull(), // 'musicians_union_standard'
  fieldName: varchar("field_name").notNull(),    // 'client_name', 'event_date', etc.
  extractionMethod: jsonb("extraction_method"),        // Rules for finding this field
  successRate: decimal("success_rate"),           // Accuracy tracking
  usageCount: integer("usage_count").default(0),
  createdBy: varchar("created_by").references(() => users.id),             // User who taught this pattern
  isGlobal: boolean("is_global").default(false), // Available to all users
  createdAt: timestamp("created_at").defaultNow(),
});

// Track manual extractions for learning
export const contractExtractions = pgTable("contract_extractions", {
  id: serial("id").primaryKey(),
  importedContractId: integer("imported_contract_id").references(() => importedContracts.id),
  extractedData: jsonb("extracted_data"),           // The manually extracted data
  extractionTimeSeconds: integer("extraction_time_seconds"), // How long it took
  userId: varchar("user_id").references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  contracts: many(contracts),
  invoices: many(invoices),
  bookings: many(bookings),
  bands: many(bands),
  complianceDocuments: many(complianceDocuments),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  blockedDates: many(blockedDates),
  userActivity: many(userActivity),
  userLoginHistory: many(userLoginHistory),
  sentMessages: many(userMessages, { relationName: "sentMessages" }),
  receivedMessages: many(userMessages, { relationName: "receivedMessages" }),
  supportTickets: many(supportTickets),
  auditLogs: many(userAuditLogs),
  emailTemplates: many(emailTemplates),
  clients: many(clients),
  feedback: many(feedback),
  unparseableMessages: many(unparseableMessages),
  messageNotifications: many(messageNotifications),
  importedContracts: many(importedContracts),
  contractExtractions: many(contractExtractions),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  user: one(users, {
    fields: [contracts.userId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [contracts.enquiryId],
    references: [bookings.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.userId],
    references: [users.id],
  }),
  contract: one(contracts, {
    fields: [invoices.contractId],
    references: [contracts.id],
  }),
  booking: one(bookings, {
    fields: [invoices.bookingId],
    references: [bookings.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  band: one(bands, {
    fields: [bookings.bandId],
    references: [bands.id],
  }),
  contracts: many(contracts),
  invoices: many(invoices),
  documents: many(bookingDocuments),
  communications: many(clientCommunications),
  messageNotifications: many(messageNotifications),
  conflicts: many(bookingConflicts, { relationName: "bookingConflicts" }),
  conflictingWith: many(bookingConflicts, { relationName: "conflictingBookings" }),
}));

export const bandsRelations = relations(bands, ({ one, many }) => ({
  user: one(users, {
    fields: [bands.userId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

export const complianceDocumentsRelations = relations(complianceDocuments, ({ one }) => ({
  user: one(users, {
    fields: [complianceDocuments.userId],
    references: [users.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
  defaultBand: one(bands, {
    fields: [userSettings.defaultBandId],
    references: [bands.id],
  }),
}));

export const bookingDocumentsRelations = relations(bookingDocuments, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingDocuments.bookingId],
    references: [bookings.id],
  }),
  user: one(users, {
    fields: [bookingDocuments.userId],
    references: [users.id],
  }),
}));

export const clientCommunicationsRelations = relations(clientCommunications, ({ one }) => ({
  user: one(users, {
    fields: [clientCommunications.userId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [clientCommunications.bookingId],
    references: [bookings.id],
  }),
}));

export const messageNotificationsRelations = relations(messageNotifications, ({ one }) => ({
  user: one(users, {
    fields: [messageNotifications.userId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [messageNotifications.bookingId],
    references: [bookings.id],
  }),
}));

export const bookingConflictsRelations = relations(bookingConflicts, ({ one }) => ({
  user: one(users, {
    fields: [bookingConflicts.userId],
    references: [users.id],
  }),
  enquiry: one(bookings, {
    fields: [bookingConflicts.enquiryId],
    references: [bookings.id],
    relationName: "bookingConflicts",
  }),
  conflicting: one(bookings, {
    fields: [bookingConflicts.conflictingId],
    references: [bookings.id],
    relationName: "conflictingBookings",
  }),
}));

export const importedContractsRelations = relations(importedContracts, ({ one, many }) => ({
  user: one(users, {
    fields: [importedContracts.userId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [importedContracts.bookingId],
    references: [bookings.id],
  }),
  extractions: many(contractExtractions),
}));

export const contractExtractionsRelations = relations(contractExtractions, ({ one }) => ({
  importedContract: one(importedContracts, {
    fields: [contractExtractions.importedContractId],
    references: [importedContracts.id],
  }),
  user: one(users, {
    fields: [contractExtractions.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBandSchema = createInsertSchema(bands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  cloudStorageUrl: true,
  cloudStorageKey: true,
  signingUrlCreatedAt: true,
  signedAt: true,
}).partial({
  enquiryId: true,
  clientAddress: true,
  clientPhone: true,
  clientEmail: true,
  venue: true, // CRITICAL FIX: Make venue optional to align with frontend and database schema
  venueAddress: true,
  paymentInstructions: true,
  equipmentRequirements: true,
  specialRequirements: true,
  clientFillableFields: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  invoiceNumber: true, // Auto-generated by backend
  createdAt: true,
  updatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceDocumentSchema = createInsertSchema(complianceDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingConflictSchema = createInsertSchema(bookingConflicts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInstrumentMappingSchema = createInsertSchema(instrumentMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  createdAt: true,
});

export const insertUserLoginHistorySchema = createInsertSchema(userLoginHistory).omit({
  id: true,
  loginTime: true,
});

export const insertUserMessageSchema = createInsertSchema(userMessages).omit({
  id: true,
  createdAt: true,
  isRead: true,
  readAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export const insertUserAuditLogSchema = createInsertSchema(userAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertUnparseableMessageSchema = createInsertSchema(unparseableMessages).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});

export const insertSecurityMonitoringSchema = createInsertSchema(securityMonitoring).omit({
  id: true,
  createdAt: true,
});

export const insertUserSecurityStatusSchema = createInsertSchema(userSecurityStatus).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageNotificationSchema = createInsertSchema(messageNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertSmsVerificationSchema = createInsertSchema(smsVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBetaInviteSchema = createInsertSchema(betaInvites).omit({
  invitedAt: true,
  usedAt: true,
});

export const insertBetaInviteCodeSchema = createInsertSchema(betaInviteCodes).omit({
  id: true,
  createdAt: true,
  currentUses: true,
  lastUsedAt: true,
  lastUsedBy: true,
});

export const insertImportedContractSchema = createInsertSchema(importedContracts);
export const insertContractExtractionPatternSchema = createInsertSchema(contractExtractionPatterns);
export const insertContractExtractionSchema = createInsertSchema(contractExtractions);
export const insertClientCommunicationSchema = createInsertSchema(clientCommunications);

// Enhanced Booking type with guaranteed field presence for frontend
export interface FormattedBooking extends Booking {
  // Ensure these fields are always present as strings (never undefined)
  eventTime: string;
  eventEndTime: string;
  title: string;
  clientName: string;
  status: string;
}

// Types - snake_case columns automatically map to camelCase properties
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = typeof blockedDates.$inferInsert;

export type MessageNotification = typeof messageNotifications.$inferSelect;
export type InsertMessageNotification = typeof messageNotifications.$inferInsert;

export type InsertBlockedDateType = z.infer<typeof insertBlockedDateSchema>;
export type InsertEnquiry = z.infer<typeof insertBookingSchema>;
export type Enquiry = typeof bookings.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type BookingWithRelations = Booking & {
  contracts: Contract[];
  invoices: Invoice[];
};
export type InsertBand = z.infer<typeof insertBandSchema>;
export type Band = typeof bands.$inferSelect;
export type InsertComplianceDocument = z.infer<typeof insertComplianceDocumentSchema>;
export type ComplianceDocument = typeof complianceDocuments.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertBookingConflict = z.infer<typeof insertBookingConflictSchema>;
export type BookingConflict = typeof bookingConflicts.$inferSelect;
export type InsertInstrumentMapping = z.infer<typeof insertInstrumentMappingSchema>;
export type InstrumentMapping = typeof instrumentMappings.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUserLoginHistory = z.infer<typeof insertUserLoginHistorySchema>;
export type InsertUnparseableMessage = z.infer<typeof insertUnparseableMessageSchema>;
export type UnparseableMessage = typeof unparseableMessages.$inferSelect;
export type UserLoginHistory = typeof userLoginHistory.$inferSelect;
export type InsertUserMessage = z.infer<typeof insertUserMessageSchema>;
export type UserMessage = typeof userMessages.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertUserAuditLog = z.infer<typeof insertUserAuditLogSchema>;
export type UserAuditLog = typeof userAuditLogs.$inferSelect;

export type InsertSecurityMonitoring = z.infer<typeof insertSecurityMonitoringSchema>;
export type SecurityMonitoring = typeof securityMonitoring.$inferSelect;
export type InsertUserSecurityStatus = z.infer<typeof insertUserSecurityStatusSchema>;
export type UserSecurityStatus = typeof userSecurityStatus.$inferSelect;

export type InsertSmsVerification = z.infer<typeof insertSmsVerificationSchema>;
export type SmsVerification = typeof smsVerifications.$inferSelect;

export type InsertImportedContract = z.infer<typeof insertImportedContractSchema>;
export type ImportedContract = typeof importedContracts.$inferSelect;
export type InsertContractExtractionPattern = z.infer<typeof insertContractExtractionPatternSchema>;
export type ContractExtractionPattern = typeof contractExtractionPatterns.$inferSelect;
export type InsertContractExtraction = z.infer<typeof insertContractExtractionSchema>;
export type ContractExtraction = typeof contractExtractions.$inferSelect;
export type InsertClientCommunication = z.infer<typeof insertClientCommunicationSchema>;
export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type InsertBetaInvite = z.infer<typeof insertBetaInviteSchema>;
export type BetaInvite = typeof betaInvites.$inferSelect;
export type InsertBetaInviteCode = z.infer<typeof insertBetaInviteCodeSchema>;
export type BetaInviteCode = typeof betaInviteCodes.$inferSelect;