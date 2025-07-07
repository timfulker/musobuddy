import { Router } from 'express';
import { storage } from './storage.js';
import { 
  insertEnquirySchema, 
  insertContractSchema, 
  insertInvoiceSchema, 
  insertBookingSchema, 
  insertComplianceSchema 
} from '../shared/schema.js';

const router = Router();

// Helper function to validate user authentication
// For now, we'll use a mock user - in production this would validate JWT tokens
const getCurrentUser = async (req: any) => {
  // Mock user for development - replace with actual auth
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'musician@example.com',
    name: 'Test Musician'
  };
  return mockUser;
};

// Enquiry routes
router.get('/enquiries', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const enquiries = await storage.getEnquiriesByUser(user.id);
    res.json(enquiries);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

router.post('/enquiries', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const validatedData = insertEnquirySchema.parse({
      ...req.body,
      userId: user.id
    });
    
    const enquiry = await storage.createEnquiry(validatedData);
    res.status(201).json(enquiry);
  } catch (error) {
    console.error('Error creating enquiry:', error);
    res.status(400).json({ error: 'Failed to create enquiry' });
  }
});

router.get('/enquiries/:id', async (req, res) => {
  try {
    const enquiry = await storage.getEnquiryById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    res.json(enquiry);
  } catch (error) {
    console.error('Error fetching enquiry:', error);
    res.status(500).json({ error: 'Failed to fetch enquiry' });
  }
});

router.put('/enquiries/:id', async (req, res) => {
  try {
    const updates = req.body;
    const enquiry = await storage.updateEnquiry(req.params.id, updates);
    res.json(enquiry);
  } catch (error) {
    console.error('Error updating enquiry:', error);
    res.status(400).json({ error: 'Failed to update enquiry' });
  }
});

router.delete('/enquiries/:id', async (req, res) => {
  try {
    await storage.deleteEnquiry(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

// Contract routes
router.get('/contracts', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const contracts = await storage.getContractsByUser(user.id);
    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

router.post('/contracts', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const validatedData = insertContractSchema.parse({
      ...req.body,
      userId: user.id
    });
    
    const contract = await storage.createContract(validatedData);
    res.status(201).json(contract);
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(400).json({ error: 'Failed to create contract' });
  }
});

router.get('/contracts/:id', async (req, res) => {
  try {
    const contract = await storage.getContractById(req.params.id);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

router.put('/contracts/:id', async (req, res) => {
  try {
    const updates = req.body;
    const contract = await storage.updateContract(req.params.id, updates);
    res.json(contract);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(400).json({ error: 'Failed to update contract' });
  }
});

// Invoice routes
router.get('/invoices', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const invoices = await storage.getInvoicesByUser(user.id);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const validatedData = insertInvoiceSchema.parse({
      ...req.body,
      userId: user.id
    });
    
    const invoice = await storage.createInvoice(validatedData);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(400).json({ error: 'Failed to create invoice' });
  }
});

router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await storage.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

router.put('/invoices/:id', async (req, res) => {
  try {
    const updates = req.body;
    const invoice = await storage.updateInvoice(req.params.id, updates);
    res.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(400).json({ error: 'Failed to update invoice' });
  }
});

// Booking routes
router.get('/bookings', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const bookings = await storage.getBookingsByUser(user.id);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const validatedData = insertBookingSchema.parse({
      ...req.body,
      userId: user.id
    });
    
    const booking = await storage.createBooking(validatedData);
    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(400).json({ error: 'Failed to create booking' });
  }
});

router.get('/bookings/:id', async (req, res) => {
  try {
    const booking = await storage.getBookingById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

router.put('/bookings/:id', async (req, res) => {
  try {
    const updates = req.body;
    const booking = await storage.updateBooking(req.params.id, updates);
    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(400).json({ error: 'Failed to update booking' });
  }
});

// Compliance routes
router.get('/compliance', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const compliance = await storage.getComplianceByUser(user.id);
    res.json(compliance);
  } catch (error) {
    console.error('Error fetching compliance:', error);
    res.status(500).json({ error: 'Failed to fetch compliance' });
  }
});

router.post('/compliance', async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    const validatedData = insertComplianceSchema.parse({
      ...req.body,
      userId: user.id
    });
    
    const compliance = await storage.createCompliance(validatedData);
    res.status(201).json(compliance);
  } catch (error) {
    console.error('Error creating compliance:', error);
    res.status(400).json({ error: 'Failed to create compliance' });
  }
});

router.get('/compliance/:id', async (req, res) => {
  try {
    const compliance = await storage.getComplianceById(req.params.id);
    if (!compliance) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }
    res.json(compliance);
  } catch (error) {
    console.error('Error fetching compliance:', error);
    res.status(500).json({ error: 'Failed to fetch compliance' });
  }
});

router.put('/compliance/:id', async (req, res) => {
  try {
    const updates = req.body;
    const compliance = await storage.updateCompliance(req.params.id, updates);
    res.json(compliance);
  } catch (error) {
    console.error('Error updating compliance:', error);
    res.status(400).json({ error: 'Failed to update compliance' });
  }
});

export default router;