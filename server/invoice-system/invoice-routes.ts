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

async function getAuthMiddleware() {
  const { isAuthenticated } = await import('../core/auth-rebuilt.js');
  return isAuthenticated;
}

export function registerIsolatedInvoiceRoutes(app: Express) {
  console.log('🔒 ISOLATED INVOICE: Setting up completely isolated invoice routes...');

  // Isolated R2 URL endpoint for invoices
  app.get('/api/isolated/invoices/:id/r2-url', async (req: any, res) => {
    try {
      const isAuthenticated = await getAuthMiddleware();
      
      // Use proper middleware pattern
      let authPassed = false;
      await new Promise<void>((resolve) => {
        isAuthenticated(req, res, () => {
          authPassed = true;
          resolve();
        });
      });
      
      if (!authPassed) return;
      
      const invoiceId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const storage = await getMainStorage();
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
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
      
      // Get user settings
      const userSettings = await storage.getUserSettings(userId);
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
      
      // Generate PDF using isolated system
      const pdfBuffer = await generateInvoicePDF(isolatedInvoice, isolatedSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
      console.log(`✅ ISOLATED INVOICE: Generated PDF for invoice #${invoiceId}`);
    } catch (error) {
      console.error('❌ ISOLATED INVOICE: Failed to generate PDF:', error);
      res.status(500).json({ error: 'Failed to generate invoice PDF' });
    }
  });

  // Download invoice PDF (isolated)
  app.get('/api/isolated/invoices/:id/download', async (req: any, res) => {
    try {
      const isAuthenticated = await getAuthMiddleware();
      if (!isAuthenticated(req, res, () => {})) return;
      
      const invoiceId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const storage = await getMainStorage();
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
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
      
      // Get user settings
      const userSettings = await storage.getUserSettings(userId);
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
      
      // Generate PDF using isolated system
      const pdfBuffer = await generateInvoicePDF(isolatedInvoice, isolatedSettings);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
      
      console.log(`✅ ISOLATED INVOICE: Downloaded PDF for invoice #${invoiceId}`);
    } catch (error) {
      console.error('❌ ISOLATED INVOICE: Failed to download PDF:', error);
      res.status(500).json({ error: 'Failed to download invoice PDF' });
    }
  });

  // Upload invoice to cloud storage (isolated)
  app.post('/api/isolated/invoices/:id/upload', async (req: any, res) => {
    try {
      const isAuthenticated = await getAuthMiddleware();
      if (!isAuthenticated(req, res, () => {})) return;
      
      const invoiceId = parseInt(req.params.id);
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const storage = await getMainStorage();
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice || invoice.userId !== userId) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      console.log(`🔄 ISOLATED INVOICE: Uploading invoice #${invoiceId} to cloud storage...`);
      
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
      
      // Get user settings
      const userSettings = await storage.getUserSettings(userId);
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
      
      // Upload using isolated system
      const result = await uploadInvoicePDF(isolatedInvoice, isolatedSettings, generateInvoicePDF);
      
      if (result.success && result.url && result.key) {
        // Update invoice with cloud URL
        await storage.updateInvoice(invoiceId, { 
          cloudUrl: result.url,
          cloudKey: result.key
        });
        
        console.log(`✅ ISOLATED INVOICE: Successfully uploaded #${invoiceId} to cloud`);
        res.json({ success: true, url: result.url, key: result.key });
      } else {
        console.error(`❌ ISOLATED INVOICE: Upload failed for #${invoiceId}:`, result.error);
        res.status(500).json({ error: result.error || 'Upload failed' });
      }
      
    } catch (error) {
      console.error('❌ ISOLATED INVOICE: Upload route failed:', error);
      res.status(500).json({ error: 'Failed to upload invoice' });
    }
  });

  console.log('✅ ISOLATED INVOICE: All isolated invoice routes registered');
}