import { pgTable, text, integer, timestamp, boolean, decimal, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table - Musicians using the platform
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  businessName: text('business_name'),
  phone: text('phone'),
  address: text('address'),
  website: text('website'),
  socialMedia: text('social_media').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Enquiries table - Initial booking requests
export const enquiries = pgTable('enquiries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  clientPhone: text('client_phone'),
  eventType: text('event_type').notNull(), // wedding, corporate, private party, etc.
  eventDate: timestamp('event_date').notNull(),
  eventTime: text('event_time'),
  venue: text('venue'),
  venueAddress: text('venue_address'),
  guestCount: integer('guest_count'),
  budget: decimal('budget', { precision: 10, scale: 2 }),
  requirements: text('requirements'),
  musicStyle: text('music_style'),
  duration: text('duration'),
  equipmentNeeded: text('equipment_needed').array(),
  status: text('status').notNull().default('new'), // new, qualified, quoted, won, lost
  source: text('source').notNull(), // email, website, referral, etc.
  notes: text('notes'),
  followUpDate: timestamp('follow_up_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Contracts table - Generated contracts for bookings
export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  enquiryId: uuid('enquiry_id').references(() => enquiries.id).notNull(),
  contractNumber: text('contract_number').notNull().unique(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  eventDate: timestamp('event_date').notNull(),
  eventTime: text('event_time'),
  venue: text('venue'),
  venueAddress: text('venue_address'),
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull(),
  deposit: decimal('deposit', { precision: 10, scale: 2 }),
  depositDue: timestamp('deposit_due'),
  balanceDue: timestamp('balance_due'),
  cancellationTerms: text('cancellation_terms'),
  equipmentProvided: text('equipment_provided').array(),
  setupTime: text('setup_time'),
  performanceTime: text('performance_time'),
  packupTime: text('packup_time'),
  additionalTerms: text('additional_terms'),
  status: text('status').notNull().default('draft'), // draft, sent, signed, cancelled
  signedAt: timestamp('signed_at'),
  signedBy: text('signed_by'),
  signatureData: text('signature_data'),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Invoices table - Generated invoices for payments
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  contractId: uuid('contract_id').references(() => contracts.id).notNull(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp('due_date').notNull(),
  description: text('description'),
  lineItems: text('line_items').array(),
  status: text('status').notNull().default('draft'), // draft, sent, paid, overdue, cancelled
  paidAt: timestamp('paid_at'),
  paidAmount: decimal('paid_amount', { precision: 10, scale: 2 }),
  paymentMethod: text('payment_method'),
  paymentReference: text('payment_reference'),
  pdfUrl: text('pdf_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Bookings table - Confirmed gigs
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  contractId: uuid('contract_id').references(() => contracts.id).notNull(),
  eventDate: timestamp('event_date').notNull(),
  eventTime: text('event_time'),
  venue: text('venue'),
  venueAddress: text('venue_address'),
  clientName: text('client_name').notNull(),
  clientContact: text('client_contact'),
  fee: decimal('fee', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('confirmed'), // confirmed, completed, cancelled
  notes: text('notes'),
  equipmentList: text('equipment_list').array(),
  travelTime: text('travel_time'),
  setupNotes: text('setup_notes'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Compliance table - Insurance, certifications, etc.
export const compliance = pgTable('compliance', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // insurance, pat_testing, dbs_check, etc.
  provider: text('provider'),
  policyNumber: text('policy_number'),
  expiryDate: timestamp('expiry_date').notNull(),
  documentUrl: text('document_url'),
  reminderSent: boolean('reminder_sent').default(false),
  status: text('status').notNull().default('active'), // active, expired, cancelled
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComplianceSchema = createInsertSchema(compliance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Enquiry = typeof enquiries.$inferSelect;
export type InsertEnquiry = z.infer<typeof insertEnquirySchema>;

export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type Compliance = typeof compliance.$inferSelect;
export type InsertCompliance = z.infer<typeof insertComplianceSchema>;