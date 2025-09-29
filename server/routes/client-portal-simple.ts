import { Router } from 'express';

const router = Router();

// In-memory storage for client portal data (replace with database in production)
const clientPortalDataStore = new Map<string, any>();

// GET client portal data
router.get('/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // For now, we'll accept any token and return mock data
    // In production, this should verify against the database
    const mockContract = {
      id: contractId,
      contractNumber: `MB-2025-001`,
      clientName: 'Test Client',
      eventDate: new Date().toISOString(),
      eventTime: '19:00',
      eventEndTime: '23:00',
      venue: 'Test Venue',
      performanceDuration: '2 hours',
    };

    // Get stored client data or empty object
    const clientData = clientPortalDataStore.get(contractId) || {};

    res.json({
      contract: mockContract,
      clientData
    });
  } catch (error) {
    console.error('Error fetching client portal:', error);
    res.status(500).json({ error: 'Failed to fetch portal data' });
  }
});

// UPDATE client portal data
router.post('/:contractId/update', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { token, ...updates } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Store the updates in memory
    const existingData = clientPortalDataStore.get(contractId) || {};
    const updatedData = {
      ...existingData,
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    clientPortalDataStore.set(contractId, updatedData);

    console.log(`Client portal updated for contract ${contractId}:`, updatedData);

    res.json({
      success: true,
      message: 'Portal updated successfully',
      data: updatedData
    });
  } catch (error) {
    console.error('Error updating client portal:', error);
    res.status(500).json({ error: 'Failed to update portal data' });
  }
});

export default router;