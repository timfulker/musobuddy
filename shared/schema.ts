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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enquiries table
export const enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email"),
  clientPhone: varchar("client_phone"),
  eventDate: timestamp("event_date"),
  eventTime: varchar("event_time"),
  eventEndTime: varchar("event_end_time"), // End time for performance
  performanceDuration: integer("performance_duration"), // Duration in minutes
  venue: varchar("venue"),
  eventType: varchar("event_type"),
  gigType: varchar("gig_type"), // Type of gig: Sax, DJ, Band, etc.
  estimatedValue: varchar("estimated_value"),
  status: varchar("status").notNull().default("new"), // new, booking_in_progress, contract_sent, confirmed, rejected
  notes: text("notes"),
  originalEmailContent: text("original_email_content"), // Store original email content
  applyNowLink: varchar("apply_now_link"), // Store "Apply Now" link from Encore emails
  responseNeeded: boolean("response_needed").default(true), // Visual indicator for enquiries requiring response
  lastContactedAt: timestamp("last_contacted_at"), // Track last contact time
  hasConflicts: boolean("has_conflicts").default(false), // Flag for potential conflicts
  conflictCount: integer("conflict_count").default(0), // Number of potential conflicts
  conflictDetails: text("conflict_details"), // JSON string with conflict details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  enquiryId: integer("enquiry_id"), // Made optional for standalone contracts
  contractNumber: varchar("contract_number").notNull().unique(),
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email"),
  clientPhone: varchar("client_phone"),
  eventDate: timestamp("event_date").notNull(),
  eventTime: varchar("event_time").notNull(),
  eventEndTime: varchar("event_end_time"), // End time for performance
  performanceDuration: integer("performance_duration"), // Duration in minutes
  venue: varchar("venue").notNull(),
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  deposit: decimal("deposit", { precision: 10, scale: 2 }),
  terms: text("terms"),
  status: varchar("status").notNull().default("draft"), // draft, sent, signed, completed
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  contractId: integer("contract_id"), // Made optional - can be null for standalone invoices
  invoiceNumber: varchar("invoice_number").notNull().unique(),
  clientName: varchar("client_name").notNull(),
  clientEmail: varchar("client_email"), // Added client email directly to invoice
  clientAddress: varchar("client_address"), // Client's address
  venueAddress: text("venue_address"), // Venue address where performance takes place
  performanceDate: timestamp("performance_date"),
  performanceFee: decimal("performance_fee", { precision: 10, scale: 2 }),
  depositPaid: decimal("deposit_paid", { precision: 10, scale: 2 }).default("0"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Amount due (fee minus deposit)
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, sent, paid, overdue
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Bookings/Gigs table
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  contractId: integer("contract_id"), // Made optional - can be null for calendar imports
  title: varchar("title").notNull(),
  clientName: varchar("client_name").notNull(),
  eventDate: timestamp("event_date").notNull(),
  eventTime: varchar("event_time").notNull(),
  eventEndTime: varchar("event_end_time"), // End time for performance
  performanceDuration: integer("performance_duration"), // Duration in minutes
  venue: varchar("venue").notNull(),
  fee: decimal("fee", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("confirmed"), // confirmed, signed, completed, cancelled
  notes: text("notes"),
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
  businessAddress: text("business_address"),
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
  gigTypes: text("gig_types"), // JSON array of gig types: ["Sax", "DJ", "Band", "Piano", etc.]
  eventTypes: text("event_types"), // Custom event types for enquiry forms
  instrumentsPlayed: text("instruments_played"), // What instruments/services the user plays
  customInstruments: text("custom_instruments"), // User-added custom instruments JSON array
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

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  enquiries: many(enquiries),
  contracts: many(contracts),
  invoices: many(invoices),
  bookings: many(bookings),
  complianceDocuments: many(complianceDocuments),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
}));

export const enquiriesRelations = relations(enquiries, ({ one, many }) => ({
  user: one(users, {
    fields: [enquiries.userId],
    references: [users.id],
  }),
  contracts: many(contracts),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  user: one(users, {
    fields: [contracts.userId],
    references: [users.id],
  }),
  enquiry: one(enquiries, {
    fields: [contracts.enquiryId],
    references: [enquiries.id],
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
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  contract: one(contracts, {
    fields: [bookings.contractId],
    references: [contracts.id],
  }),
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
export const insertEnquirySchema = createInsertSchema(enquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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





// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;
export type Enquiry = typeof enquiries.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
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

