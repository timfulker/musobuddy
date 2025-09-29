import { Router } from 'express';
import { db } from '../db';
import { contracts, clientPortalData } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// Schema for client portal updates
const clientPortalUpdateSchema = z.object({
  token: z.string(),
  // Event Info
  venueContact: z.string().optional(),
  soundTechContact: z.string().optional(),
  stageSize: z.string().optional(),
  dressCode: z.string().optional(),
  powerEquipment: z.string().optional(),
  // Music Requests
  styleMood: z.string().optional(),
  setOrder: z.string().optional(),
  mustPlaySongs: z.string().optional(),
  avoidSongs: z.string().optional(),
  // Special Moments
  firstDanceSong: z.string().optional(),
  processionalSong: z.string().optional(),
  signingRegisterSong: z.string().optional(),
  recessionalSong: z.string().optional(),
  specialDedications: z.string().optional(),
  guestAnnouncements: z.string().optional(),
  // Logistics
  loadInInfo: z.string().optional(),
  soundCheckTime: z.string().optional(),
  weatherContingency: z.string().optional(),
  parkingPermitRequired: z.boolean().optional(),
  mealProvided: z.boolean().optional(),
  dietaryRequirements: z.string().optional(),
  // Collaboration
  sharedNotes: z.string().optional(),
  referenceTracks: z.string().optional(),
  photoPermission: z.boolean().optional(),
  encoreAllowed: z.boolean().optional(),
  encoreSuggestions: z.string().optional(),
});

// GET client portal data
router.get('/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { token } = req.query;

    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    // Verify the contract exists and token matches
    const [contract] = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.id, contractId),
          eq(contracts.clientPortalToken, token as string)
        )
      )
      .limit(1);

    if (!contract) {
      return res.status(404).json({ error: 'Invalid contract or token' });
    }

    // Get existing client portal data if any
    const [existingData] = await db
      .select()
      .from(clientPortalData)
      .where(eq(clientPortalData.contractId, contractId))
      .limit(1);

    res.json({
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        clientName: contract.clientName,
        eventDate: contract.eventDate,
        eventTime: contract.eventTime,
        eventEndTime: contract.eventEndTime,
        venue: contract.venue,
        performanceDuration: contract.performanceDuration,
      },
      clientData: existingData || {}
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

    // Validate the request body
    const validationResult = clientPortalUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid data',
        details: validationResult.error.flatten()
      });
    }

    const { token, ...updates } = validationResult.data;

    // Verify the contract exists and token matches
    const [contract] = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.id, contractId),
          eq(contracts.clientPortalToken, token)
        )
      )
      .limit(1);

    if (!contract) {
      return res.status(404).json({ error: 'Invalid contract or token' });
    }

    // Check if client portal data already exists
    const [existingData] = await db
      .select()
      .from(clientPortalData)
      .where(eq(clientPortalData.contractId, contractId))
      .limit(1);

    const dataToSave = {
      ...updates,
      contractId,
      updatedAt: new Date()
    };

    if (existingData) {
      // Update existing data
      await db
        .update(clientPortalData)
        .set(dataToSave)
        .where(eq(clientPortalData.contractId, contractId));
    } else {
      // Insert new data
      await db
        .insert(clientPortalData)
        .values({
          id: crypto.randomUUID(),
          ...dataToSave,
          createdAt: new Date()
        });
    }

    res.json({ success: true, message: 'Portal updated successfully' });
  } catch (error) {
    console.error('Error updating client portal:', error);
    res.status(500).json({ error: 'Failed to update portal data' });
  }
});

export default router;