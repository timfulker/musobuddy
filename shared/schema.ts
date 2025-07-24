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
  password: varchar("password"), // Password for admin-created users
  isAdmin: boolean("is_admin").default(false), // Admin role flag
  tier: varchar("tier").default("free"), // User tier (free, pro, enterprise)
  // Stripe subscription fields
  plan: text("plan").default("free"), // 'free', 'core', 'premium'
  isSubscribed: boolean("is_subscribed").default(false),
  isLifetime: boolean("is_lifetime").default(false),
  isBetaTester: boolean("is_beta_tester").default(false),
  betaStartDate: timestamp("beta_start_date"),
  betaEndDate: timestamp("beta_end_date"),
  betaFeedbackCount: integer("beta_feedback_count").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  isActive: boolean("is_active").default(true), // Account active/suspended
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIP: varchar("last_login_ip"),
  loginAttempts: integer("login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  forcePasswordChange: boolean("force_password_change").default(false),
  notificationPreferences: jsonb("notification_preferences").default('{"email": true, "sms": false, "push": true}'),
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
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  deposit: decimal("deposit", { precision: 10, scale: 2 }).default("0.00"), // Deposit amount with 7-day payment clause
  
  // Essential rider/payment information
  paymentInstructions: text("payment_instructions"), // How payment should be made
  equipmentRequirements: text("equipment_requirements"), // Equipment needed from venue
  specialRequirements: text("special_requirements"), // Any special rider requirements
  
  // Client-fillable field tracking
  clientFillableFields: text("client_fillable_fields"), // JSON array of field names that client must fill
  
  // Contract management
  status: varchar("status").notNull().default("draft"), // draft, sent, signed, completed
  signedAt: timestamp("signed_at"),
  
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
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, sent, paid, overdue
  paidAt: timestamp("paid_at"),
  cloudStorageUrl: text("cloud_storage_url"),
  cloudStorageKey: text("cloud_storage_key"),
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
  eventTime: varchar("event_time"),
  eventEndTime: varchar("event_end_time"), // End time for performance
  performanceDuration: text("performance_duration"), // Duration as text (e.g., "2 hours", "90 minutes")
  venue: varchar("venue"),
  venueAddress: text("venue_address"),
  clientAddress: text("client_address"),
  eventType: varchar("event_type"),
  gigType: varchar("gig_type"), // Type of gig: Sax, DJ, Band, etc.
  fee: decimal("fee", { precision: 10, scale: 2 }),
  equipmentRequirements: text("equipment_requirements"),
  specialRequirements: text("special_requirements"),
  styles: text("styles"), // Musical styles requested for this booking
  equipmentProvided: text("equipment_provided"), // What equipment musician provides
  whatsIncluded: text("whats_included"), // What's included in the service
  status: varchar("status").notNull().default("new"), // New 6-stage workflow: new, awaiting_response, client_confirms, contract_sent, confirmed, cancelled, completed
  previousStatus: varchar("previous_status"), // Track status before auto-completion to completed
  notes: text("notes"),
  originalEmailContent: text("original_email_content"), // Store original email content
  applyNowLink: varchar("apply_now_link"), // Store "Apply Now" link from Encore emails
  responseNeeded: boolean("response_needed").default(true), // Visual indicator for enquiries requiring response
  lastContactedAt: timestamp("last_contacted_at"), // Track last contact time
  hasConflicts: boolean("has_conflicts").default(false), // Flag for potential conflicts
  
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
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  businessAddress: text("business_address"), // Legacy field for backward compatibility
  addressLine1: varchar("address_line1"),
  addressLine2: varchar("address_line2"),
  city: varchar("city"),
  county: varchar("county"),
  postcode: varchar("postcode"),
  phone: varchar("phone"),
  website: varchar("website"),
  taxNumber: varchar("tax_number"),
  bankDetails: text("bank_details"),
  defaultTerms: text("default_terms"),
  emailFromName: varchar("email_from_name"),
  nextInvoiceNumber: integer("next_invoice_number").default(1),
  // Conflict detection settings
  defaultSetupTime: integer("default_setup_time").default(60), // minutes
  defaultBreakdownTime: integer("default_breakdown_time").default(30), // minutes
  weddingBufferTime: integer("wedding_buffer_time").default(120), // minutes
  corporateBufferTime: integer("corporate_buffer_time").default(60), // minutes
  defaultBufferTime: integer("default_buffer_time").default(90), // minutes
  maxTravelDistance: integer("max_travel_distance").default(100), // miles
  homePostcode: varchar("home_postcode"), // For distance calculations
  // AI-powered instrument and gig type system
  selectedInstruments: text("selected_instruments"), // JSON array of selected instruments from CSV
  aiGeneratedGigTypes: text("ai_generated_gig_types"), // JSON array of AI-generated gig types
  customGigTypes: text("custom_gig_types"), // JSON array of user-added custom gig types  
  gigTypes: text("gig_types"), // JSON array of final gig types (AI + custom combined)
  eventTypes: text("event_types"), // Custom event types for enquiry forms
  instrumentsPlayed: text("instruments_played"), // What instruments/services the user plays
  customInstruments: text("custom_instruments"), // User-added custom instruments JSON array
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email templates table for custom responses
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(), // "Decline Enquiry", "Request More Info", etc.
  subject: varchar("subject").notNull(),
  emailBody: text("email_body").notNull(),
  smsBody: text("sms_body"),
  isDefault: boolean("is_default").default(false),
  isAutoRespond: boolean("is_auto_respond").default(false), // Show in auto-respond options
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Global gig types table - stores user's selected gig types for dropdown population
export const globalGigTypes = pgTable("global_gig_types", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  gigTypes: text("gig_types").notNull(), // JSON array of gig types
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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





// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
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
export type UserLoginHistory = typeof userLoginHistory.$inferSelect;
export type InsertUserMessage = z.infer<typeof insertUserMessageSchema>;
export type UserMessage = typeof userMessages.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertUserAuditLog = z.infer<typeof insertUserAuditLogSchema>;
export type UserAuditLog = typeof userAuditLogs.$inferSelect;

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

// Types for the new tables
export type InsertImportedContract = z.infer<typeof insertImportedContractSchema>;
export type ImportedContract = typeof importedContracts.$inferSelect;
export type InsertContractExtractionPattern = z.infer<typeof insertContractExtractionPatternSchema>;
export type ContractExtractionPattern = typeof contractExtractionPatterns.$inferSelect;
export type InsertContractExtraction = z.infer<typeof insertContractExtractionSchema>;
export type ContractExtraction = typeof contractExtractions.$inferSelect;

