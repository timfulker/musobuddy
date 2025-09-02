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

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  // User Type (simple booleans)
  isAdmin: boolean("is_admin").default(false),         // Admin role flag
  isAssigned: boolean("is_assigned").default(false),   // Free access granted by admin
  isBetaTester: boolean("is_beta_tester").default(false), // Beta program participant
  
  // Access Control
  trialEndsAt: timestamp("trial_ends_at").default(null), // 30 days regular, 1 year beta
  hasPaid: boolean("has_paid").default(false),           // Successfully paid via Stripe
  
  // Onboarding tracking
  onboardingCompleted: boolean("onboarding_completed").default(false), // Setup wizard completion status
  
  // Notes
  accountNotes: text("account_notes").default(null),     // Admin notes about account
  
  // Stripe Integration
  stripeCustomerId: text("stripe_customer_id").default(null),
  stripeSubscriptionId: text("stripe_subscription_id").default(null),
  
  // Assignment tracking
  assignedAt: timestamp("assigned_at").default(null),    // When admin granted access
  assignedBy: varchar("assigned_by").default(null),      // Which admin granted it
  
  // Widget fields (keep these as they're used)
  emailPrefix: text("email_prefix").unique(),            // For personalized email addresses
  quickAddToken: text("quick_add_token").unique(),       // Unique token for quick-add booking widget
  widgetUrl: text("widget_url"),                         // Permanent widget URL for booking requests
  widgetQrCode: text("widget_qr_code"),                  // Base64 QR code for the widget URL
  phoneNumber: varchar("phone_number", { length: 20 }),  // Keep for contact info
  // Firebase Auth Integration
  firebaseUid: text("firebase_uid").unique(), // Firebase user UID for authentication
  // Existing fields
  isActive: boolean("is_active").default(true), // Account active/suspended
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIP: varchar("last_login_ip"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  // Password reset fields (Firebase handles password management)
  passwordResetToken: varchar("password_reset_token", { length: 128 }),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
  // AI usage tracking removed - unlimited AI usage for all users
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
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
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
  fromUserId: varchar("from_user_id").notNull(), // Admin who sent the message
  toUserId: varchar("to_user_id"), // Null for broadcast messages
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
  userId: varchar("user_id").notNull(),
  assignedToUserId: varchar("assigned_to_user_id"), // Admin assigned to handle
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
  userId: varchar("user_id").notNull(),
  adminUserId: varchar("admin_user_id"), // Admin who made the change
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

// Trial tracking removed - now using simplified trial_ends_at field in users table

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
  userId: varchar("user_id").notNull(),
  featureUsed: varchar("feature_used", { length: 100 }),
  usageCount: integer("usage_count").default(1),
  lastUsed: timestamp("last_used").defaultNow(),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});





// Contracts table - Musicians' Union minimum fields + essential rider information
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  enquiryId: integer("enquiry_id"), // Made optional for standalone contracts
  contractNumber: varchar("contract_number").notNull().unique(),
  
  // Client details - TESTING MODE: relaxed constraints
  clientName: varchar("client_name").notNull(),
  clientAddress: text("client_address"),
  clientPhone: varchar("client_phone"),
  clientEmail: varchar("client_email"),
  
  // Event details - TESTING MODE: relaxed constraints
  venue: varchar("venue"), // temporarily optional
  venueAddress: text("venue_address"),
  eventDate: timestamp("event_date").notNull(),
  eventTime: varchar("event_time"), // temporarily optional
  eventEndTime: varchar("event_end_time"), // temporarily optional
  performanceDuration: varchar("performance_duration"), // Actual performance time (independent of event timeframe, e.g., "2 hours", "2 x 45 min sets")
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  deposit: decimal("deposit", { precision: 10, scale: 2 }).default("0.00"), // Deposit amount with 7-day payment clause
  depositDays: integer("deposit_days").default(7), // Number of days within which deposit must be paid
  travelExpenses: decimal("travel_expenses", { precision: 10, scale: 2 }).default("0.00"), // Travel expenses (when shown separately)
  
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
  
  // PHASE 2: Automatic reminder system (commented out for manual-only phase 1)
  // reminderEnabled: boolean("reminder_enabled").default(false),
  // reminderDays: integer("reminder_days").default(3), // Days between reminders
  // lastReminderSent: timestamp("last_reminder_sent"),
  // reminderCount: integer("reminder_count").default(0),
  
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
  venue_contact: text("venue_contact"),
  sound_tech_contact: text("sound_tech_contact"),
  stage_size: varchar("stage_size", { length: 50 }),
  power_equipment: text("power_equipment"),
  dress_code: varchar("dress_code", { length: 255 }),
  style_mood: varchar("style_mood", { length: 50 }),
  must_play_songs: text("must_play_songs"),
  avoid_songs: text("avoid_songs"),
  set_order: varchar("set_order", { length: 50 }),
  first_dance_song: varchar("first_dance_song", { length: 255 }),
  processional_song: varchar("processional_song", { length: 255 }),
  signing_register_song: varchar("signing_register_song", { length: 255 }),
  recessional_song: varchar("recessional_song", { length: 255 }),
  special_dedications: text("special_dedications"),
  guest_announcements: text("guest_announcements"),
  load_in_info: text("load_in_info"),
  sound_check_time: varchar("sound_check_time", { length: 50 }),
  weather_contingency: text("weather_contingency"),
  parking_permit_required: boolean("parking_permit_required").default(false),
  meal_provided: boolean("meal_provided").default(false),
  dietary_requirements: text("dietary_requirements"),
  shared_notes: text("shared_notes"),
  reference_tracks: text("reference_tracks"),
  photo_permission: boolean("photo_permission").default(false),
  encore_allowed: boolean("encore_allowed").default(false),
  encore_suggestions: varchar("encore_suggestions", { length: 255 }),
  
  // Client portal access (collaborative booking form)
  clientPortalUrl: text("client_portal_url"), // URL for client to access collaborative booking form
  clientPortalToken: text("client_portal_token"), // Secure token for client portal access
  clientPortalQrCode: text("client_portal_qr_code"), // Base64 QR code for client portal
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  contractId: integer("contract_id"), // Made optional - can be null for standalone invoices
  bookingId: integer("booking_id").references(() => bookings.id), // Direct link to booking
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email"), // Added client email directly to invoice
  ccEmail: varchar("cc_email"), // Optional CC email for invoice notifications
  clientAddress: varchar("client_address"), // Client's address
  venueAddress: text("venue_address"), // Venue address where performance takes place
  eventDate: timestamp("event_date"),
  fee: decimal("fee", { precision: 10, scale: 2 }),
  depositPaid: decimal("deposit_paid", { precision: 10, scale: 2 }).default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Amount due (fee minus deposit)
  performanceDuration: text("performance_duration"), // Duration details (e.g., "2 x 45 min sets")
  gigType: text("gig_type"), // Event type (e.g., "Wedding", "Corporate Event")
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, sent, paid, overdue
  paidAt: timestamp("paid_at"),
  cloudStorageUrl: text("cloud_storage_url"),
  cloudStorageKey: text("cloud_storage_key"),
  shareToken: varchar("share_token").notNull(), // Secure token for public invoice access
  // Stripe payment fields
  stripePaymentLinkId: text("stripe_payment_link_id"),
  stripePaymentUrl: text("stripe_payment_url"),
  stripeSessionId: text("stripe_session_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings/Enquiries table - Phase 3: Renamed from bookings_new, contains enquiry data
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email"),
  clientPhone: varchar("client_phone"),
  eventDate: timestamp("event_date"),
  // FIXED: Consistent field naming that matches frontend expectations
  eventTime: varchar("event_time"), // Changed from event_start_time to event_time
  eventEndTime: varchar("event_end_time"), // Changed from event_finish_time to event_end_time
  performanceDuration: text("performance_duration"), // Duration as text (e.g., "2 hours", "90 minutes")
  venue: varchar("venue"),
  venueAddress: text("venue_address"),
  clientAddress: text("client_address"),
  what3words: varchar("what3words"), // Precise location using what3words
  gigType: varchar("gig_type"), // Type of gig: Sax, DJ, Band, etc.
  eventType: varchar("event_type"), // Type of event: Wedding, Corporate, Birthday, etc.
  fee: decimal("fee", { precision: 10, scale: 2 }),
  equipmentRequirements: text("equipment_requirements"),
  specialRequirements: text("special_requirements"),
  styles: text("styles"), // Musical styles requested for this booking
  equipmentProvided: text("equipment_provided"), // What equipment musician provides
  whatsIncluded: text("whats_included"), // What's included in the service
  status: varchar("status").notNull().default("new"), // New 6-stage workflow: new, awaiting_response, client_confirms, contract_sent, confirmed, cancelled, completed
  previousStatus: varchar("previous_status"), // Track status before auto-completion to completed
  workflowStage: varchar("workflow_stage").notNull().default("initial"), // Workflow progression: initial, negotiating, contract, confirmed, performed, complete
  notes: text("notes"),
  originalEmailContent: text("original_email_content"), // Store original email content
  applyNowLink: varchar("apply_now_link"), // Store "Apply Now" link from Encore emails
  responseNeeded: boolean("response_needed").default(true), // Visual indicator for enquiries requiring response
  lastContactedAt: timestamp("last_contacted_at"), // Track last contact time
  hasConflicts: boolean("has_conflicts").default(false), // Flag for potential conflicts
  
  // Legacy single document fields - will be removed after migration
  documentUrl: text("document_url"), // URL to the uploaded document in R2
  documentKey: text("document_key"), // Storage key for the document in R2
  documentName: text("document_name"), // Original filename of the uploaded document
  documentUploadedAt: timestamp("document_uploaded_at"), // When the document was uploaded
  
  // New workflow tracking fields
  completed: boolean("completed").default(false), // Booking completed flag
  conflictCount: integer("conflict_count").default(0), // Number of potential conflicts
  conflictDetails: text("conflict_details"), // JSON string with conflict details
  
  // New tag system for tracking progress states
  contractSent: boolean("contract_sent").default(false), // Contract has been sent
  contractSigned: boolean("contract_signed").default(false), // Contract has been signed
  invoiceSent: boolean("invoice_sent").default(false), // Invoice has been sent
  paidInFull: boolean("paid_in_full").default(false), // Payment received in full
  depositPaid: boolean("deposit_paid").default(false), // Deposit has been paid
  
  // Financial tracking
  quotedAmount: decimal("quoted_amount", { precision: 10, scale: 2 }), // Amount quoted to client
  travelExpense: decimal("travel_expense", { precision: 10, scale: 2 }), // Fixed travel charge for this booking
  depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }), // Deposit amount if required
  finalAmount: decimal("final_amount", { precision: 10, scale: 2 }), // Final agreed amount
  
  // Document storage - comprehensive document management
  uploadedContractUrl: text("uploaded_contract_url"), // URL to uploaded external contract stored on R2
  uploadedContractKey: text("uploaded_contract_key"), // R2 storage key for the uploaded contract
  uploadedContractFilename: varchar("uploaded_contract_filename"), // Original filename of uploaded contract
  
  // Additional document storage for comprehensive booking documentation
  uploadedInvoiceUrl: text("uploaded_invoice_url"), // URL to uploaded external invoice stored on R2
  uploadedInvoiceKey: text("uploaded_invoice_key"), // R2 storage key for the uploaded invoice
  uploadedInvoiceFilename: varchar("uploaded_invoice_filename"), // Original filename of uploaded invoice
  
  // General document storage for any booking-related documents
  uploadedDocuments: jsonb("uploaded_documents").default('[]'), // Array of {url, key, filename, type, uploadedAt} objects
  
  // COLLABORATIVE FIELDS - Fields completed collaboratively with client after contract signing
  // Technical Details
  venueContact: text("venue_contact"), // Venue on-day contact phone
  soundTechContact: text("sound_tech_contact"), // Sound engineer contact
  stageSize: varchar("stage_size"), // small, medium, large, no-stage
  powerEquipment: text("power_equipment"), // Power availability and restrictions
  soundCheckTime: text("sound_check_time"), // Preferred sound check timing
  loadInInfo: text("load_in_info"), // Load-in access instructions
  
  // Music Preferences  
  styleMood: varchar("style_mood"), // upbeat, jazzy, romantic, background, mixed
  setOrder: varchar("set_order"), // upbeat-first, slow-first, mixed, no-preference
  mustPlaySongs: text("must_play_songs"), // Up to 6 favorite songs
  avoidSongs: text("avoid_songs"), // Songs/genres to avoid
  referenceTracks: text("reference_tracks"), // YouTube links or examples
  
  // Special Moments (Wedding Events)
  firstDanceSong: text("first_dance_song"), // First dance music
  processionalSong: text("processional_song"), // Walking down aisle
  signingRegisterSong: text("signing_register_song"), // Register signing music
  recessionalSong: text("recessional_song"), // Walking back up aisle
  specialDedications: text("special_dedications"), // Special song dedications
  guestAnnouncements: text("guest_announcements"), // Announcements during event
  
  // Event Logistics
  weatherContingency: text("weather_contingency"), // Backup plan for outdoor events
  parkingPermitRequired: boolean("parking_permit_required").default(false),
  mealProvided: boolean("meal_provided").default(false),
  dietaryRequirements: text("dietary_requirements"), // Meal dietary needs
  sharedNotes: text("shared_notes"), // Additional collaborative planning notes
  
  // Extended Features
  photoPermission: boolean("photo_permission").default(true), // Permission to take photos
  encoreAllowed: boolean("encore_allowed").default(true), // Encore performance allowed
  encoreSuggestions: text("encore_suggestions"), // Suggested encore songs
  
  // Field Lock Settings for collaborative forms
  fieldLocks: jsonb("field_locks").default('{}'), // Field lock settings: {fieldName: {locked: boolean, lockedBy: 'user'|'client'}}
  
  // Additional contact fields moved from other sections
  venueContactInfo: text("venue_contact_info"), // Venue manager contact details
  parkingInfo: text("parking_info"), // Parking instructions for performer
  contactPhone: text("contact_phone"), // Alternative contact phone
  dressCode: text("dress_code"), // Event dress code requirements
  
  // Mileage calculation fields
  distance: text("distance"), // Human-readable distance (e.g., "56.0 miles")
  distanceValue: integer("distance_value"), // Numeric distance in meters for sorting/calculations
  duration: text("duration"), // Human-readable duration (e.g., "1 hour 8 mins")
  
  // Email processing duplicate prevention
  emailHash: varchar("email_hash").unique(), // Unique hash to prevent duplicate email processing
  processedAt: timestamp("processed_at"), // When email was processed into booking
  
  // Client collaboration access
  collaborationToken: varchar("collaboration_token").unique(), // Token for client access to collaborative form
  collaborationTokenGeneratedAt: timestamp("collaboration_token_generated_at"), // When token was generated
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Booking documents table - supports multiple documents per booking
export const bookingDocuments = pgTable("booking_documents", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  userId: varchar("user_id").notNull(), // For security - ensure user owns the booking
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
  userId: varchar("user_id").notNull(), // User who sent the communication
  bookingId: integer("booking_id"), // Optional - communication may not be linked to a specific booking
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
  userId: varchar("user_id").notNull(),
  type: varchar("type").notNull(), // public_liability, pat_testing, music_license
  name: varchar("name").notNull(),
  expiryDate: timestamp("expiry_date"),
  status: varchar("status").notNull().default("valid"), // valid, expiring, expired
  documentUrl: varchar("document_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User settings/profile table for business details
export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  businessName: varchar("business_name"),
  businessEmail: varchar("business_email"),
  addressLine1: varchar("address_line1"),
  addressLine2: varchar("address_line2"),
  city: varchar("city"),
  county: varchar("county"),
  postcode: varchar("postcode"),
  phone: varchar("phone"),
  website: varchar("website"),
  taxNumber: varchar("tax_number"),
  bankDetails: text("bank_details"),
  contractClauses: jsonb("contract_clauses").default('{}'), // Contract clauses selection
  customClauses: jsonb("custom_clauses").default('[]'), // Custom user-added clauses
  emailFromName: varchar("email_from_name"),
  invoicePrefix: varchar("invoice_prefix"), // Custom invoice prefix (e.g., "JS" for Jake Stanley)
  nextInvoiceNumber: integer("next_invoice_number").default(1),
  // Conflict detection settings
  defaultSetupTime: integer("default_setup_time").default(60), // minutes
  defaultBreakdownTime: integer("default_breakdown_time").default(30), // minutes
  weddingBufferTime: integer("wedding_buffer_time").default(120), // minutes
  corporateBufferTime: integer("corporate_buffer_time").default(60), // minutes
  defaultBufferTime: integer("default_buffer_time").default(90), // minutes
  maxTravelDistance: integer("max_travel_distance").default(100), // miles
  homePostcode: varchar("home_postcode"), // For distance calculations
  // Performance settings
  bookingDisplayLimit: varchar("booking_display_limit").default("50"), // "50" for last 50 bookings, "all" for no limit
  // Instrument and gig type settings
  primaryInstrument: varchar("primary_instrument"), // saxophone, guitar, piano, violin, drums, dj, etc.
  secondaryInstruments: jsonb("secondary_instruments").default('[]'), // Array of additional instruments
  gigTypes: text("gig_types"), // AI-generated gig types based on selected instruments
  customGigTypes: text("custom_gig_types"), // User's manually added custom gig types
  // Theme preferences for invoices and contracts
  themeTemplate: varchar("theme_template").default("classic"), // classic, modern, casual, dj, busker
  themeTone: varchar("theme_tone").default("formal"), // formal, casual
  themeFont: varchar("theme_font").default("roboto"), // roboto, raleway, pacifico, oswald
  themeAccentColor: varchar("theme_accent_color").default("#673ab7"), // HEX color
  themeLogoUrl: varchar("theme_logo_url"), // URL to uploaded logo
  themeSignatureUrl: varchar("theme_signature_url"), // URL to uploaded signature
  themeBanner: varchar("theme_banner"), // Custom banner/tagline
  themeShowSetlist: boolean("theme_show_setlist").default(false), // Show setlist on invoices
  themeShowRiderNotes: boolean("theme_show_rider_notes").default(false), // Show rider notes
  themeShowQrCode: boolean("theme_show_qr_code").default(false), // Show QR code for social media
  themeShowTerms: boolean("theme_show_terms").default(true), // Show terms and conditions
  themeCustomTitle: varchar("theme_custom_title"), // Custom title instead of "Invoice"
  
  // Email signature settings
  emailSignature: text("email_signature"), // Custom email signature for templates
  
  // Invoice Settings
  invoicePaymentTerms: varchar("invoice_payment_terms").default("7_days"), // Payment terms: on_receipt, 3_days, 7_days, 14_days, 30_days, on_performance, cash_as_agreed
  defaultInvoiceDueDays: integer("default_invoice_due_days").default(7), // Default days until invoice is due
  invoiceClauses: jsonb("invoice_clauses").default('{}'), // Invoice clauses selection
  customInvoiceClauses: jsonb("custom_invoice_clauses").default('[]'), // Custom user-added invoice clauses
  
  // Distance Unit Preference
  distanceUnits: varchar("distance_units").default("miles"), // "miles" or "km" - user preference for distance display
  
  // AI Pricing Guide for intelligent quote generation
  aiPricingEnabled: boolean("ai_pricing_enabled").default(true), // Enable AI pricing recommendations
  baseHourlyRate: decimal("base_hourly_rate", { precision: 10, scale: 2 }).default("130.00"), // £130/hour base rate
  minimumBookingHours: decimal("minimum_booking_hours", { precision: 3, scale: 1 }).default("2.0"), // 2 hour minimum
  additionalHourRate: decimal("additional_hour_rate", { precision: 10, scale: 2 }).default("60.00"), // £60 for additional hours
  djServiceRate: decimal("dj_service_rate", { precision: 10, scale: 2 }).default("300.00"), // £300 for DJ service
  travelSurchargeEnabled: boolean("travel_surcharge_enabled").default(false), // Enable travel surcharges (Phase 2)
  localTravelRadius: integer("local_travel_radius").default(20), // Free travel within 20 miles
  customPricingPackages: jsonb("custom_pricing_packages").default('[]'), // Array of custom packages {name, hours, price, description}
  pricingNotes: text("pricing_notes"), // Custom notes about pricing for AI to include
  specialOffers: text("special_offers"), // Current special offers for AI to mention
  seasonalPricing: jsonb("seasonal_pricing").default('{}'), // Seasonal pricing adjustments {summer: 1.1, winter: 0.9}
  
  // Travel Expense Integration removed - always include travel in performance fee for simplified calculations
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Google Calendar Integration
export const googleCalendarIntegration = pgTable("google_calendar_integration", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
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
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
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

// Removed globalGigTypes table - consolidated into customGigTypes field in userSettings

// Booking conflicts table
export const bookingConflicts = pgTable("booking_conflicts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  enquiryId: integer("enquiry_id").notNull(),
  conflictingId: integer("conflicting_id").notNull(), // ID of conflicting enquiry/booking
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
  userId: varchar("user_id").notNull(),
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
  userId: varchar("user_id").notNull(),
  source: varchar("source").notNull(), // 'widget', 'email', 'manual'
  fromContact: varchar("from_contact"), // Email, phone, or name of sender
  subject: varchar("subject"), // Email subject line for matching to bookings
  rawMessage: text("raw_message").notNull(), // The original unparsed message
  clientAddress: text("client_address"), // Optional address if provided
  parsingErrorDetails: text("parsing_error_details"), // Why AI couldn't parse it
  messageType: varchar("message_type").default("general"), // 'general', 'price_enquiry', 'vague'
  status: varchar("status").default("pending"), // 'pending', 'reviewed', 'converted', 'discarded'
  reviewNotes: text("review_notes"), // User notes from manual review
  convertedToBookingId: integer("converted_to_booking_id"), // If manually converted to booking
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  contracts: many(contracts),
  invoices: many(invoices),
  bookings: many(bookings),
  complianceDocuments: many(complianceDocuments),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
}));

// Removed enquiriesRelations - now using bookingsRelations instead

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
  bookings: many(bookings),
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
  contracts: many(contracts),
  invoices: many(invoices),
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
}));

// Insert schemas
// Note: insertEnquirySchema now uses bookings table schema
export const insertEnquirySchema = createInsertSchema(bookings).omit({
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
  // PHASE 2: Reminder fields (commented out for manual-only phase 1)
  // lastReminderSent: true,
  // reminderCount: true,
}).partial({
  // Make certain fields optional for creation
  enquiryId: true,
  clientAddress: true,
  clientPhone: true,
  clientEmail: true,
  venueAddress: true,
  paymentInstructions: true,
  equipmentRequirements: true,
  specialRequirements: true,
  clientFillableFields: true,
  // PHASE 2: Reminder fields (commented out for manual-only phase 1)
  // reminderEnabled: true,
  // reminderDays: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  invoiceNumber: true, // Auto-generated by backend
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceDocumentSchema = createInsertSchema(complianceDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
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

// UPDATED TYPE DEFINITIONS with consistent field mapping - moved to avoid duplicates

// Enhanced Booking type with guaranteed field presence for frontend
export interface FormattedBooking extends Booking {
  // Ensure these fields are always present as strings (never undefined)
  eventTime: string;
  eventEndTime: string;
  title: string;
  clientName: string;
  status: string;
}

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

// Security monitoring schemas
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

// SMS Verification schemas
export const insertSmsVerificationSchema = createInsertSchema(smsVerifications).omit({
  id: true,
  createdAt: true,
});





// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Blocked dates types
export type BlockedDate = typeof blockedDates.$inferSelect;
export type InsertBlockedDate = typeof blockedDates.$inferInsert;

// Message notification types
export type MessageNotification = typeof messageNotifications.$inferSelect;
export type InsertMessageNotification = typeof messageNotifications.$inferInsert;

// Blocked dates Zod schemas
export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

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
// Security monitoring types
export type InsertSecurityMonitoring = z.infer<typeof insertSecurityMonitoringSchema>;
export type SecurityMonitoring = typeof securityMonitoring.$inferSelect;
export type InsertUserSecurityStatus = z.infer<typeof insertUserSecurityStatusSchema>;
export type UserSecurityStatus = typeof userSecurityStatus.$inferSelect;

// SMS Verification types
export type InsertSmsVerification = z.infer<typeof insertSmsVerificationSchema>;
export type SmsVerification = typeof smsVerifications.$inferSelect;

// Beta invite management table (email-based invites)
export const betaInvites = pgTable("beta_invites", {
  email: varchar("email").primaryKey(),
  status: varchar("status").default("pending"), // pending, used, expired
  invitedBy: varchar("invited_by").notNull(), // Admin user ID who sent invite
  invitedAt: timestamp("invited_at").defaultNow(),
  usedAt: timestamp("used_at"),
  usedBy: varchar("used_by"), // User ID who used the invite
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
  createdBy: varchar("created_by").notNull(), // Admin user ID who created it
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiry date
  lastUsedAt: timestamp("last_used_at"),
  lastUsedBy: varchar("last_used_by"), // Last user ID who used it
});

// NEW: Contract Learning System Tables

// Store imported contract files
export const importedContracts = pgTable("imported_contracts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
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
  createdBy: varchar("created_by"),             // User who taught this pattern
  isGlobal: boolean("is_global").default(false), // Available to all users
  createdAt: timestamp("created_at").defaultNow(),
});

// Track manual extractions for learning
export const contractExtractions = pgTable("contract_extractions", {
  id: serial("id").primaryKey(),
  importedContractId: integer("imported_contract_id").references(() => importedContracts.id),
  extractedData: jsonb("extracted_data"),           // The manually extracted data
  extractionTimeSeconds: integer("extraction_time_seconds"), // How long it took
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for imported contracts
export const importedContractsRelations = relations(importedContracts, ({ one, many }) => ({
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
}));

// Zod schemas for the new tables
export const insertImportedContractSchema = createInsertSchema(importedContracts);
export const insertContractExtractionPatternSchema = createInsertSchema(contractExtractionPatterns);
export const insertContractExtractionSchema = createInsertSchema(contractExtractions);
export const insertClientCommunicationSchema = createInsertSchema(clientCommunications);
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

// Types for the new tables
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

