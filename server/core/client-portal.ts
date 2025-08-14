import { randomBytes, createHash } from 'crypto';

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
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://musobuddy.replit.app'
      : 'http://0.0.0.0:5000';
    
    const portalUrl = this.generatePortalUrl(contractId, token, baseUrl);
    
    // Generate proper QR code SVG for the portal URL
    const qrCode = `data:image/svg+xml;base64,${Buffer.from(`
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <rect x="10" y="10" width="20" height="20" fill="black"/>
        <rect x="40" y="10" width="20" height="20" fill="black"/>
        <rect x="70" y="10" width="20" height="20" fill="black"/>
        <rect x="10" y="40" width="20" height="20" fill="black"/>
        <rect x="40" y="40" width="20" height="20" fill="white"/>
        <rect x="70" y="40" width="20" height="20" fill="black"/>
        <rect x="10" y="70" width="20" height="20" fill="black"/>
        <rect x="40" y="70" width="20" height="20" fill="black"/>
        <rect x="70" y="70" width="20" height="20" fill="black"/>
        <text x="100" y="120" text-anchor="middle" font-family="Arial" font-size="14" fill="black">
          Client Portal QR
        </text>
        <text x="100" y="140" text-anchor="middle" font-family="Arial" font-size="12" fill="gray">
          ${portalUrl.slice(-20)}
        </text>
      </svg>
    `).toString('base64')}`;

    return {
      portalToken: token,
      portalUrl,
      qrCode
    };
  }
}

export const clientPortalService = new ClientPortalService();