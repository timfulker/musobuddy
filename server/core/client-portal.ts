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

  // Setup client portal for contract using R2-hosted collaborative forms
  async setupClientPortal(contractId: number): Promise<{
    portalToken: string;
    portalUrl: string;
    qrCode: string;
  }> {
    try {
      // Import required modules
      const { storage } = await import('../core/storage');
      const { collaborativeFormGenerator } = await import('./collaborative-form-generator');

      // Get contract data
      const contract = await storage.getContract(contractId);
      if (!contract) {
        throw new Error(`Contract ${contractId} not found`);
      }

      // Get associated booking data if it exists
      let bookingData = null;
      if (contract.enquiryId) {
        bookingData = await storage.getBooking(contract.enquiryId);
      }

      // Convert contract to booking data format
      const formData = {
        id: contract.enquiryId || contract.id,
        contractId: contract.id,
        clientName: contract.clientName,
        venue: contract.venue,
        eventDate: contract.eventDate,
        eventTime: contract.eventTime,
        eventEndTime: contract.eventEndTime,
        performanceDuration: contract.performanceDuration,
        // Include existing booking data if available
        ...bookingData
      };

      // Upload collaborative form to R2 (bypasses routing issues)
      const result = await collaborativeFormGenerator.uploadCollaborativeForm(
        formData,
        'https://musobuddy.replit.app' // API endpoint for form submissions
      );

      // Generate proper QR code for the R2-hosted form
      const qrCodeDataUrl = await QRCode.toDataURL(result.url, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      console.log(`✅ [CLIENT-PORTAL] Generated R2-hosted collaborative form: ${result.url}`);
      
      return {
        portalToken: result.token,
        portalUrl: result.url,
        qrCode: qrCodeDataUrl
      };
    } catch (error) {
      console.error('❌ Error setting up client portal:', error);
      
      // Fallback to a basic portal if collaborative form generation fails
      const token = this.generatePortalToken();
      const fallbackUrl = `https://musobuddy.replit.app/client-error?contract=${contractId}`;
      
      const fallbackQr = `data:image/svg+xml;base64,${Buffer.from(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white"/>
          <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="black">
            Portal Error
          </text>
          <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="10" fill="gray">
            Contact performer
          </text>
        </svg>
      `).toString('base64')}`;
      
      return {
        portalToken: token,
        portalUrl: fallbackUrl,
        qrCode: fallbackQr
      };
    }
  }
}

export const clientPortalService = new ClientPortalService();