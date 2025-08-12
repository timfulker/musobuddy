import { randomBytes } from 'crypto';
import QRCode from 'qrcode';

export class ClientPortalService {
  
  /**
   * Generate a secure token for client portal access
   */
  generatePortalToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate client portal URL with secure token
   */
  generatePortalUrl(contractId: number, portalToken: string): string {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://www.musobuddy.com' 
      : process.env.REPLIT_DOMAINS || 'http://localhost:5000';
    
    return `${baseUrl}/client-portal/${contractId}?token=${portalToken}`;
  }

  /**
   * Generate QR code for client portal URL
   */
  async generatePortalQrCode(portalUrl: string): Promise<string> {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(portalUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#191970', // MusoBuddy midnight blue
          light: '#FFFFFF'
        }
      });
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Setup complete client portal access for a contract
   */
  async setupClientPortal(contractId: number): Promise<{
    portalUrl: string;
    portalToken: string;
    qrCode: string;
  }> {
    const portalToken = this.generatePortalToken();
    const portalUrl = this.generatePortalUrl(contractId, portalToken);
    const qrCode = await this.generatePortalQrCode(portalUrl);

    return {
      portalUrl,
      portalToken,
      qrCode
    };
  }

  /**
   * Verify client portal token for access
   */
  verifyPortalToken(providedToken: string, storedToken: string): boolean {
    return providedToken === storedToken;
  }
}

export const clientPortalService = new ClientPortalService();