import { Router } from 'express';

const router = Router();

// Mock storage for development - will be replaced with actual database
let mockEnquiries = [];
let mockContracts = [];
let mockInvoices = [];
let mockBookings = [];
let mockCompliance = [];

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Helper function to get current user (mock for now)
const getCurrentUser = () => ({
  id: 'user-1',
  email: 'musician@example.com',
  name: 'Test Musician'
});

// Enquiry routes
router.get('/enquiries', (req, res) => {
  try {
    const user = getCurrentUser();
    const userEnquiries = mockEnquiries.filter(e => e.userId === user.id);
    res.json(userEnquiries);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
});

router.post('/enquiries', (req, res) => {
  try {
    const user = getCurrentUser();
    const enquiry = {
      id: generateId(),
      userId: user.id,
      ...req.body,
      status: req.body.status || 'new',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockEnquiries.push(enquiry);
    res.status(201).json(enquiry);
  } catch (error) {
    console.error('Error creating enquiry:', error);
    res.status(400).json({ error: 'Failed to create enquiry' });
  }
});

router.get('/enquiries/:id', (req, res) => {
  try {
    const enquiry = mockEnquiries.find(e => e.id === req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    res.json(enquiry);
  } catch (error) {
    console.error('Error fetching enquiry:', error);
    res.status(500).json({ error: 'Failed to fetch enquiry' });
  }
});

router.put('/enquiries/:id', (req, res) => {
  try {
    const index = mockEnquiries.findIndex(e => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    mockEnquiries[index] = {
      ...mockEnquiries[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    res.json(mockEnquiries[index]);
  } catch (error) {
    console.error('Error updating enquiry:', error);
    res.status(400).json({ error: 'Failed to update enquiry' });
  }
});

router.delete('/enquiries/:id', (req, res) => {
  try {
    const index = mockEnquiries.findIndex(e => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    
    mockEnquiries.splice(index, 1);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    res.status(500).json({ error: 'Failed to delete enquiry' });
  }
});

// Contract routes
router.get('/contracts', (req, res) => {
  try {
    const user = getCurrentUser();
    const userContracts = mockContracts.filter(c => c.userId === user.id);
    res.json(userContracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
});

router.post('/contracts', (req, res) => {
  try {
    const user = getCurrentUser();
    const contract = {
      id: generateId(),
      userId: user.id,
      contractNumber: `CONTRACT-${Date.now()}`,
      ...req.body,
      status: req.body.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockContracts.push(contract);
    res.status(201).json(contract);
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(400).json({ error: 'Failed to create contract' });
  }
});

router.get('/contracts/:id', (req, res) => {
  try {
    const contract = mockContracts.find(c => c.id === req.params.id);
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json(contract);
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
});

router.put('/contracts/:id', (req, res) => {
  try {
    const index = mockContracts.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    
    mockContracts[index] = {
      ...mockContracts[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    res.json(mockContracts[index]);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(400).json({ error: 'Failed to update contract' });
  }
});

// Invoice routes
router.get('/invoices', (req, res) => {
  try {
    const user = getCurrentUser();
    const userInvoices = mockInvoices.filter(i => i.userId === user.id);
    res.json(userInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.post('/invoices', (req, res) => {
  try {
    const user = getCurrentUser();
    const invoice = {
      id: generateId(),
      userId: user.id,
      invoiceNumber: `INV-${Date.now()}`,
      ...req.body,
      status: req.body.status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockInvoices.push(invoice);
    res.status(201).json(invoice);
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(400).json({ error: 'Failed to create invoice' });
  }
});

router.get('/invoices/:id', (req, res) => {
  try {
    const invoice = mockInvoices.find(i => i.id === req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

router.put('/invoices/:id', (req, res) => {
  try {
    const index = mockInvoices.findIndex(i => i.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    mockInvoices[index] = {
      ...mockInvoices[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    res.json(mockInvoices[index]);
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(400).json({ error: 'Failed to update invoice' });
  }
});

// Booking routes
router.get('/bookings', (req, res) => {
  try {
    const user = getCurrentUser();
    const userBookings = mockBookings.filter(b => b.userId === user.id);
    res.json(userBookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

router.post('/bookings', (req, res) => {
  try {
    const user = getCurrentUser();
    const booking = {
      id: generateId(),
      userId: user.id,
      ...req.body,
      status: req.body.status || 'confirmed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockBookings.push(booking);
    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(400).json({ error: 'Failed to create booking' });
  }
});

router.get('/bookings/:id', (req, res) => {
  try {
    const booking = mockBookings.find(b => b.id === req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

router.put('/bookings/:id', (req, res) => {
  try {
    const index = mockBookings.findIndex(b => b.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    mockBookings[index] = {
      ...mockBookings[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    res.json(mockBookings[index]);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(400).json({ error: 'Failed to update booking' });
  }
});

// Compliance routes
router.get('/compliance', (req, res) => {
  try {
    const user = getCurrentUser();
    const userCompliance = mockCompliance.filter(c => c.userId === user.id);
    res.json(userCompliance);
  } catch (error) {
    console.error('Error fetching compliance:', error);
    res.status(500).json({ error: 'Failed to fetch compliance' });
  }
});

router.post('/compliance', (req, res) => {
  try {
    const user = getCurrentUser();
    const compliance = {
      id: generateId(),
      userId: user.id,
      ...req.body,
      status: req.body.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockCompliance.push(compliance);
    res.status(201).json(compliance);
  } catch (error) {
    console.error('Error creating compliance:', error);
    res.status(400).json({ error: 'Failed to create compliance' });
  }
});

router.get('/compliance/:id', (req, res) => {
  try {
    const compliance = mockCompliance.find(c => c.id === req.params.id);
    if (!compliance) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }
    res.json(compliance);
  } catch (error) {
    console.error('Error fetching compliance:', error);
    res.status(500).json({ error: 'Failed to fetch compliance' });
  }
});

router.put('/compliance/:id', (req, res) => {
  try {
    const index = mockCompliance.findIndex(c => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }
    
    mockCompliance[index] = {
      ...mockCompliance[index],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    res.json(mockCompliance[index]);
  } catch (error) {
    console.error('Error updating compliance:', error);
    res.status(400).json({ error: 'Failed to update compliance' });
  }
});

export default router;