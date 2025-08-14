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
      if (contract.clientPortalToken !== token) {
        return res.status(403).json({ error: 'Invalid portal access token' });
      }

      // Return simple client portal page
      const portalHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Client Portal - Contract ${contract.contractNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .portal-container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .contract-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .btn { background: #4f46e5; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; text-decoration: none; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="portal-container">
            <div class="header">
              <h1>🎵 Client Portal</h1>
              <p>Welcome ${contract.clientName}!</p>
            </div>
            
            <div class="contract-details">
              <h3>Your Event Details</h3>
              <div class="detail-row"><strong>Date:</strong> <span>${new Date(contract.eventDate).toLocaleDateString('en-GB')}</span></div>
              <div class="detail-row"><strong>Time:</strong> <span>${contract.eventTime || 'TBC'}</span></div>
              <div class="detail-row"><strong>Venue:</strong> <span>${contract.venue}</span></div>
              <div class="detail-row"><strong>Fee:</strong> <span>£${contract.fee}</span></div>
              ${contract.deposit ? `<div class="detail-row"><strong>Deposit:</strong> <span>£${contract.deposit}</span></div>` : ''}
            </div>

            <div style="text-align: center;">
              <p>✅ <strong>Contract Status:</strong> ${contract.status.toUpperCase()}</p>
              <p>This portal allows you to view your confirmed booking details.</p>
              <p>For any changes or questions, please contact us directly.</p>
            </div>
          </div>
        </body>
        </html>
      `;

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