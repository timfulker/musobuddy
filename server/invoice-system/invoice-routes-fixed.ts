// ⚠️  COMPLETELY ISOLATED INVOICE ROUTES ⚠️
// This file provides isolated API endpoints for invoice system ONLY
// Last Updated: August 4, 2025
// NO dependencies on main routes or storage systems

import type { Express } from 'express';
import { generateInvoicePDF } from './invoice-generator.js';
import { uploadInvoicePDF, getInvoicePDFUrl } from './invoice-storage.js';
import type { IsolatedInvoice, IsolatedUserSettings } from './invoice-generator.js';

// Import only what we need from the main system
async function getMainStorage() {
  const { default: storage } = await import('../core/storage.js');
  return storage;
}

export function registerIsolatedInvoiceRoutes(app: Express, storage?: any, isAuthenticated?: any) {
  console.log('🔒 ISOLATED INVOICE: Setting up completely isolated invoice routes...');

  // Isolated R2 URL endpoint for invoices
  app.get('/api/isolated/invoices/:id/r2-url', isAuthenticated, async (req: any, res) => {
    console.log(`🔗 ISOLATED INVOICE: R2 URL request for invoice ${req.params.id}`);
    try {
      const invoiceId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const storageInstance = storage || await getMainStorage();
      const invoice = await storageInstance.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      // Check if invoice already has R2 URL
      if (invoice.cloudStorageUrl) {
        console.log(`✅ ISOLATED INVOICE: Returning existing R2 URL for invoice #${invoiceId}`);
        return res.json({ url: invoice.cloudStorageUrl });
      }

      console.log(`🔄 ISOLATED INVOICE: Generating and uploading invoice #${invoiceId} to R2...`);

      // Get user settings
      const userSettings = await storageInstance.getUserSettings(userId);
      const isolatedSettings: IsolatedUserSettings | null = userSettings ? {
        businessName: userSettings.businessName,
        primaryInstrument: userSettings.primaryInstrument,
        phone: userSettings.phone,
        email: userSettings.email,
        website: userSettings.website,
        addressLine1: userSettings.addressLine1,
        city: userSettings.city,
        county: userSettings.county,
        postcode: userSettings.postcode,
        taxNumber: userSettings.taxNumber,
        bankDetails: userSettings.bankDetails,
        accountNumber: userSettings.accountNumber,
        sortCode: userSettings.sortCode,
        bankName: userSettings.bankName
      } : null;
      
      // Convert to isolated format
      const isolatedInvoice: IsolatedInvoice = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        clientAddress: invoice.clientAddress,
        amount: invoice.amount,
        performanceFee: invoice.performanceFee,
        depositPaid: invoice.depositPaid,
        performanceDate: invoice.performanceDate,
        dueDate: invoice.dueDate,
        venueAddress: invoice.venueAddress,
        createdAt: invoice.createdAt,
        status: invoice.status,
        userId: invoice.userId
      };

      // Upload to R2 using isolated system
      const uploadResult = await uploadInvoicePDF(isolatedInvoice, isolatedSettings);
      
      if (uploadResult.success && uploadResult.url) {
        // Update invoice with R2 URL
        await storageInstance.updateInvoice(invoiceId, {
          cloudStorageUrl: uploadResult.url,
          cloudStorageKey: uploadResult.key
        });
        
        console.log(`✅ ISOLATED INVOICE: Invoice #${invoiceId} uploaded to R2: ${uploadResult.url}`);
        return res.json({ url: uploadResult.url });
      } else {
        console.log(`❌ ISOLATED INVOICE: Failed to upload invoice #${invoiceId} to R2`);
        return res.status(500).json({ error: 'Failed to upload invoice to cloud storage' });
      }
      
    } catch (error) {
      console.error('❌ ISOLATED INVOICE: Failed to generate invoice R2 URL:', error);
      res.status(500).json({ error: 'Failed to generate invoice URL' });
    }
  });

  console.log('✅ ISOLATED INVOICE: All isolated invoice routes registered');
}