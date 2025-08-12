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
}

export const clientPortalService = new ClientPortalService();