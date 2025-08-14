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
    return `${baseUrl}/client-portal/${contractId}?token=${token}`;
  }

  // Setup client portal for contract
  async setupClientPortal(contractId: number): Promise<{
    portalToken: string;
    portalUrl: string;
    qrCode: string;
  }> {
    const token = this.generatePortalToken();
    // Always use production URL for external links - this ensures client portals work correctly
    const baseUrl = 'https://musobuddy.replit.app';
    
    const portalUrl = this.generatePortalUrl(contractId, token, baseUrl);
    
    // Generate proper QR code for the portal URL
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(portalUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      return {
        portalToken: token,
        portalUrl,
        qrCode: qrCodeDataUrl
      };
    } catch (error) {
      console.error('❌ Error generating QR code:', error);
      // Fallback to a minimal QR-style pattern if generation fails
      const fallbackQr = `data:image/svg+xml;base64,${Buffer.from(`
        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="200" fill="white"/>
          <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="12" fill="black">
            QR Code Error
          </text>
          <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="10" fill="gray">
            Use portal link instead
          </text>
        </svg>
      `).toString('base64')}`;
      
      return {
        portalToken: token,
        portalUrl,
        qrCode: fallbackQr
      };
    }
  }
}

export const clientPortalService = new ClientPortalService();