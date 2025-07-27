import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Token-based authentication system that bypasses session issues
 * Uses JWT tokens stored in localStorage for persistence
 */
export class TokenAuthSystem {
  private static readonly JWT_SECRET = process.env.SESSION_SECRET || 'musobuddy-jwt-secret-2025';
  private static readonly TOKEN_EXPIRY = '24h';

  /**
   * Generate JWT token for authenticated user
   */
  static generateToken(userId: number, email: string): string {
    return jwt.sign(
      { 
        userId, 
        email, 
        iat: Math.floor(Date.now() / 1000),
        type: 'auth'
      },
      this.JWT_SECRET,
      { expiresIn: this.TOKEN_EXPIRY }
    );
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string): { userId: number; email: string } | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      return { userId: decoded.userId, email: decoded.email };
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Middleware for token authentication
   */
  static middleware() {
    return (req: any, res: any, next: any) => {
      // Check for token in Authorization header
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (token) {
        const decoded = this.verifyToken(token);
        if (decoded) {
          req.userId = decoded.userId;
          req.userEmail = decoded.email;
          console.log('✅ Token authentication successful for:', decoded.email);
        } else {
          console.log('❌ Token authentication failed');
        }
      } else {
        console.log('🔍 No token provided in request');
      }

      next();
    };
  }
}