import type { Express } from "express";
import { requireAuth } from '../middleware/auth';
import { storage } from "../core/storage";

export function registerClientRoutes(app: Express) {
  console.log('👥 Setting up client routes...');

  // Client portal access route (public - no auth required)
  app.get('/client-portal/:contractId', async (req, res) => {
    try {
      const { contractId } = req.params;
      const { token } = req.query;

      if (!token) {
        return res.status(403).json({ error: 'Portal access token required' });
      }

      // Get contract and verify token
      const contract = await storage.getContract(parseInt(contractId), undefined); // No user ID needed for portal access
      
      if (!contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Verify the portal token matches
      if (contract.client_portal_token !== token) {
        return res.status(403).json({ error: 'Invalid portal access token' });
      }

      // Generate collaborative booking form for the client
      const { generateCollaborativeForm } = await import('../core/collaborative-form-generator');
      
      // Get associated booking data if it exists
      let bookingData = null;
      if (contract.enquiry_id) {
        bookingData = await storage.getBooking(contract.enquiry_id);
      }
      
      const portalHtml = generateCollaborativeForm(contract, bookingData, token as string);

      res.send(portalHtml);

    } catch (error) {
      console.error('❌ Error accessing client portal:', error);
      res.status(500).json({ error: 'Portal access failed' });
    }
  });

  // Get all clients for the authenticated user
  app.get('/api/clients', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // For now, return empty array since client storage isn't implemented yet
      // In a full implementation, this would fetch from database
      const clients = [];
      
      res.json(clients);

    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  // Create a new client
  app.post('/api/clients', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const clientData = req.body;
      
      // For now, return success without actually storing
      // In a full implementation, this would save to database
      res.json({ 
        message: 'Client functionality in development',
        clientData
      });

    } catch (error) {
      console.error('❌ Error creating client:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  });

  // Update a client
  app.put('/api/clients/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const clientId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const updates = req.body;
      
      // For now, return success without actually updating
      res.json({ 
        message: 'Client update functionality in development',
        clientId,
        updates
      });

    } catch (error) {
      console.error('❌ Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  // Delete a client
  app.delete('/api/clients/:id', requireAuth, async (req, res) => {
    try {
      const userId = req.user?.userId;
      const clientId = req.params.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // For now, return success without actually deleting
      res.json({ 
        message: 'Client delete functionality in development',
        clientId
      });

    } catch (error) {
      console.error('❌ Error deleting client:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  console.log('✅ Client routes configured');
}