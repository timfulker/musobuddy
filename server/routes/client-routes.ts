import type { Express } from "express";
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { storage } from "../core/storage";

export function registerClientRoutes(app: Express) {
  console.log('👥 Setting up client routes...');

  // Get all clients for the authenticated user
  app.get('/api/clients', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`✅ Fetching clients for user ${userId}`);
      const clients = await storage.getClients(userId);
      
      res.json(clients);

    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      res.status(500).json({ error: 'Failed to fetch clients' });
    }
  });

  // Create a new client
  app.post('/api/clients', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const client = await storage.createClient(userId, req.body);
      
      res.json(client);

    } catch (error) {
      console.error('❌ Error creating client:', error);
      res.status(500).json({ error: 'Failed to create client' });
    }
  });

  // Update a client
  app.patch('/api/clients/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const clientId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const client = await storage.updateClient(userId, clientId, req.body);
      
      res.json(client);

    } catch (error) {
      console.error('❌ Error updating client:', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  });

  // Delete a client
  app.delete('/api/clients/:id', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const clientId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await storage.deleteClient(userId, clientId);
      
      res.json({ success: true });

    } catch (error) {
      console.error('❌ Error deleting client:', error);
      res.status(500).json({ error: 'Failed to delete client' });
    }
  });

  // Populate address book from existing bookings
  app.post('/api/clients/populate-from-bookings', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log(`📋 Populating clients from bookings for user ${userId}`);
      
      // Get all bookings for the user
      const bookings = await storage.getBookings(userId);
      console.log(`📋 Found ${bookings.length} bookings to process`);
      
      let created = 0;
      let updated = 0;
      
      for (const booking of bookings) {
        if (!booking.clientName || booking.clientName.trim() === '') {
          continue;
        }
        
        // Check if client already exists
        const existingClients = await storage.getClients(userId);
        let existingClient = existingClients.find(client => 
          client.name.toLowerCase() === booking.clientName.toLowerCase() ||
          (booking.clientEmail && client.email === booking.clientEmail)
        );
        
        if (existingClient) {
          // Update existing client with booking data
          const bookingIds = existingClient.bookingIds ? JSON.parse(existingClient.bookingIds) : [];
          if (!bookingIds.includes(booking.id)) {
            bookingIds.push(booking.id);
          }
          
          const totalRevenue = parseFloat(existingClient.totalRevenue || '0') + parseFloat(booking.agreedFee || '0');
          
          await storage.updateClient(userId, existingClient.id, {
            email: booking.clientEmail || existingClient.email,
            phone: booking.clientPhone || existingClient.phone,
            address: booking.clientAddress || existingClient.address,
            totalBookings: bookingIds.length,
            totalRevenue: totalRevenue.toString(),
            bookingIds: JSON.stringify(bookingIds)
          });
          
          updated++;
        } else {
          // Create new client
          await storage.createClient(userId, {
            name: booking.clientName,
            email: booking.clientEmail,
            phone: booking.clientPhone,
            address: booking.clientAddress,
            notes: `Imported from booking: ${booking.eventType || 'Unknown event'}`,
            totalBookings: 1,
            totalRevenue: booking.agreedFee || '0',
            bookingIds: JSON.stringify([booking.id])
          });
          
          created++;
        }
      }
      
      console.log(`📋 Import complete: ${created} created, ${updated} updated`);
      
      res.json({
        message: `Address book updated: ${created} new clients added, ${updated} existing clients updated`,
        created,
        updated
      });

    } catch (error) {
      console.error('❌ Error populating clients from bookings:', error);
      res.status(500).json({ error: 'Failed to populate clients from bookings' });
    }
  });

  // Create a new client
  app.post('/api/clients', authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
      
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
  app.put('/api/clients/:id', authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
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
  app.delete('/api/clients/:id', authenticate, async (req, res) => {
    try {
      const userId = req.user?.id;
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