import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertEnquirySchema, insertContractSchema, insertInvoiceSchema, insertBookingSchema, insertComplianceDocumentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Enquiry routes
  app.get('/api/enquiries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const enquiries = await storage.getEnquiries(userId);
      res.json(enquiries);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
      res.status(500).json({ message: "Failed to fetch enquiries" });
    }
  });

  app.get('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const enquiry = await storage.getEnquiry(id, userId);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error) {
      console.error("Error fetching enquiry:", error);
      res.status(500).json({ message: "Failed to fetch enquiry" });
    }
  });

  app.post('/api/enquiries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const enquiryData = insertEnquirySchema.parse(data);
      const enquiry = await storage.createEnquiry(enquiryData);
      res.status(201).json(enquiry);
    } catch (error) {
      console.error("Error creating enquiry:", error);
      res.status(500).json({ message: "Failed to create enquiry" });
    }
  });

  app.patch('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updates = req.body;
      const enquiry = await storage.updateEnquiry(id, updates, userId);
      if (!enquiry) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.json(enquiry);
    } catch (error) {
      console.error("Error updating enquiry:", error);
      res.status(500).json({ message: "Failed to update enquiry" });
    }
  });

  app.delete('/api/enquiries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const success = await storage.deleteEnquiry(id, userId);
      if (!success) {
        return res.status(404).json({ message: "Enquiry not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting enquiry:", error);
      res.status(500).json({ message: "Failed to delete enquiry" });
    }
  });

  // Contract routes
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const contractData = insertContractSchema.parse(data);
      const contract = await storage.createContract(contractData);
      res.status(201).json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.post('/api/contracts/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contractId } = req.body;
      
      const contract = await storage.getContract(contractId, userId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // In a real app, you would send email here using a service like SendGrid
      // For now, just simulate sending and update status
      const updatedContract = await storage.updateContract(contractId, { status: 'sent' }, userId);
      
      res.json({ message: "Contract sent successfully", contract: updatedContract });
    } catch (error) {
      console.error("Error sending contract email:", error);
      res.status(500).json({ message: "Failed to send contract email" });
    }
  });

  // Invoice routes
  app.get('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoices = await storage.getInvoices(userId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post('/api/invoices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invoiceData = insertInvoiceSchema.parse({ ...req.body, userId });
      const invoice = await storage.createInvoice(invoiceData);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Booking routes
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/bookings/upcoming', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getUpcomingBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching upcoming bookings:", error);
      res.status(500).json({ message: "Failed to fetch upcoming bookings" });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, userId };
      
      // Convert eventDate string to Date if present
      if (data.eventDate && typeof data.eventDate === 'string') {
        data.eventDate = new Date(data.eventDate);
      }
      
      const bookingData = insertBookingSchema.parse(data);
      const booking = await storage.createBooking(bookingData);
      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Compliance document routes
  app.get('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getComplianceDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching compliance documents:", error);
      res.status(500).json({ message: "Failed to fetch compliance documents" });
    }
  });

  app.post('/api/compliance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documentData = insertComplianceDocumentSchema.parse({ ...req.body, userId });
      const document = await storage.createComplianceDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating compliance document:", error);
      res.status(500).json({ message: "Failed to create compliance document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
