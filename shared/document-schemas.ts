import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { bookingDocuments } from "./schema";

// Insert schema for booking documents
export const insertBookingDocumentSchema = createInsertSchema(bookingDocuments, {
  documentType: z.enum(["contract", "invoice", "other"]).default("other"),
  documentName: z.string().min(1, "Document name is required"),
  documentUrl: z.string().url("Valid URL required"),
  documentKey: z.string().min(1, "Document key is required"),
}).omit({
  id: true,
  uploadedAt: true,
});

// Type definitions
export type InsertBookingDocument = z.infer<typeof insertBookingDocumentSchema>;
export type BookingDocument = typeof bookingDocuments.$inferSelect;

// Upload request schema
export const uploadDocumentSchema = z.object({
  bookingId: z.number().positive("Valid booking ID required"),
  documentType: z.enum(["contract", "invoice", "other"]).default("other"),
});

export type UploadDocumentRequest = z.infer<typeof uploadDocumentSchema>;

// Document response schema
export const documentResponseSchema = z.object({
  id: z.number(),
  bookingId: z.number(),
  userId: z.string(),
  documentType: z.string(),
  documentName: z.string(),
  documentUrl: z.string(),
  documentKey: z.string(),
  uploadedAt: z.date(),
});

export type DocumentResponse = z.infer<typeof documentResponseSchema>;