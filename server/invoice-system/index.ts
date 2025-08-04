// ⚠️  COMPLETELY ISOLATED INVOICE SYSTEM ENTRY POINT ⚠️
// This is the main entry point for the isolated invoice system
// Last Updated: August 4, 2025
// NO dependencies on any other systems

export { generateInvoicePDF } from './invoice-generator.js';
export { uploadInvoicePDF, getInvoicePDFUrl } from './invoice-storage.js';
export { registerIsolatedInvoiceRoutes } from './invoice-routes.js';
export type { IsolatedInvoice, IsolatedUserSettings } from './invoice-generator.js';

// Version tracking for isolation
export const ISOLATED_INVOICE_VERSION = '2025.08.04.001';
export const ISOLATION_STATUS = 'COMPLETELY_ISOLATED';

console.log(`🔒 ISOLATED INVOICE SYSTEM v${ISOLATED_INVOICE_VERSION} - Status: ${ISOLATION_STATUS}`);