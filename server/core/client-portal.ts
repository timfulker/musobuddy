import { randomBytes, createHash } from 'crypto';
import QRCode from 'qrcode';

class ClientPortalService {
  // Generate a secure portal token
  generatePortalToken(): string {
    return randomBytes(32).toString('hex');
  }

  // Create a hashed version for database storage
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // Verify portal token (simple comparison for now)
  verifyPortalToken(providedToken: string, storedToken: string): boolean {
    if (!providedToken || !storedToken) {
      return false;
    }
    // For now, simple direct comparison
    // In production, you might want to hash and compare
    return providedToken === storedToken;
  }

  // Generate client portal URL
  generatePortalUrl(contractId: number, token: string, baseUrl: string): string {
    return `${baseUrl}/api/portal/${contractId}?token=${token}`;
  }

  // Setup client portal for contract using React booking collaboration page
  async setupClientPortal(contractId: number): Promise<{
    portalToken: string;
    portalUrl: string;
    qrCode: string;
  }> {
    try {
      // Import required modules
      const { storage } = await import('../core/storage');

      // Get contract data
      const contract = await storage.getContract(contractId);
      if (!contract) {
        throw new Error(`Contract ${contractId} not found`);
      }

      // Get associated booking data if it exists
      let bookingId = contract.enquiryId;
      
      // If no booking exists yet, we need to create one for collaboration
      if (!bookingId) {
        console.log(`📝 [CLIENT-PORTAL] No booking found for contract ${contractId}, creating one for collaboration`);
        const { bookings } = await import('../../shared/schema');
        const { db } = await import('../core/database');
        
        // Create a minimal booking record for collaboration
        const [newBooking] = await db.insert(bookings).values({
          userId: contract.userId,
          clientName: contract.clientName,
          clientEmail: contract.clientEmail || '',
          venue: contract.venue,
          eventDate: contract.eventDate,
          eventType: contract.eventType || 'Performance',
          status: 'draft',
          collaborationToken: this.generatePortalToken(),
          contractId: contract.id
        }).returning();
        
        bookingId = newBooking.id;
        console.log(`✅ [CLIENT-PORTAL] Created booking ${bookingId} for contract ${contractId}`);
      }
      
      // Get or generate collaboration token
      const { bookings } = await import('../../shared/schema');
      const { db } = await import('../core/database');
      const { eq } = await import('drizzle-orm');
      
      // Get existing booking to check for token
      const [existingBooking] = await db.select()
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .limit(1);
      
      let token = existingBooking?.collaborationToken;
      
      // Generate new token if none exists
      if (!token) {
        token = this.generatePortalToken();
        await db.update(bookings)
          .set({ collaborationToken: token })
          .where(eq(bookings.id, bookingId));
        console.log(`📝 [CLIENT-PORTAL] Generated new collaboration token for booking ${bookingId}`);
      } else {
        console.log(`✅ [CLIENT-PORTAL] Using existing collaboration token for booking ${bookingId}`);
      }
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://musobuddy.replit.app'
        : 'http://localhost:5173';
      
      // Generate the correct booking collaboration URL
      const portalUrl = `${baseUrl}/booking/${bookingId}/collaborate?token=${token}`;

      // Generate QR code for the collaboration URL
      const qrCodeDataUrl = await QRCode.toDataURL(portalUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      console.log(`✅ [CLIENT-PORTAL] Generated booking collaboration URL: ${portalUrl}`);
      
      return {
        portalToken: token,
        portalUrl: portalUrl,
        qrCode: qrCodeDataUrl
      };
    } catch (error) {
      console.error('❌ Error setting up client portal:', error);
      
      // Fallback: Try to use contract's booking ID if available
      const token = this.generatePortalToken();
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://musobuddy.replit.app'
        : 'http://localhost:5173';
      
      // Try to at least generate a collaboration URL even if setup failed
      // This assumes the contract has an associated booking
      const fallbackBookingId = (error as any)?.bookingId || contractId;
      const fallbackUrl = `${baseUrl}/booking/${fallbackBookingId}/collaborate?token=${token}`;
      
      console.warn(`⚠️ [CLIENT-PORTAL] Using fallback URL for contract ${contractId}: ${fallbackUrl}`);
      
      const fallbackQr = await QRCode.toDataURL(fallbackUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      return {
        portalToken: token,
        portalUrl: fallbackUrl,
        qrCode: fallbackQr
      };
    }
  }
}

export const clientPortalService = new ClientPortalService();