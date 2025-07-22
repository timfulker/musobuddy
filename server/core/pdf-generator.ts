// Create this file: server/core/pdf-generator.ts
// This file exports the correct PDF generation functions for cloud storage

export { generateContractPDF, generateInvoicePDF } from './pdf-generator-original';

// Re-export for compatibility
export * from './pdf-generator-original';