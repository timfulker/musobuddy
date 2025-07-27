import { type Express } from "express";
import { storage } from "./storage";
import { db } from "./database";
import { users, phoneVerifications } from "../../shared/schema";
import { eq, desc, and, gte, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ENV, isProduction, getAppServerUrl } from "./environment";

export interface AuthRoutes {
  app: Express;
}

export class ProductionAuthSystem {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  private normalizePhoneNumber(phone: string): string {
    // Convert to international format consistently
    let normalized = phone.replace(/\s+/g, '');
    
    // Handle UK numbers
    if (normalized.startsWith('07')) {
      normalized = '+44' + normalized.slice(1);
    } else if (normalized.startsWith('447')) {
      normalized = '+' + normalized;
    }
    
    console.log('📱 Phone normalization:', { original: phone, normalized });
    return normalized;
  }

  // CRITICAL FIX: Unified session save function
  private async saveSession(req: any): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.save((err: any) => {
        if (err) {
          console.error('❌ Session save failed:', err);
          reject(err);
        } else {
          console.log('✅ Session saved successfully:', {
            sessionId: req.sessionID,
            userId: req.session.userId,
            timestamp: new Date().toISOString()
          });
          resolve();
        }
      });
    });
  }

  public registerRoutes() {
    console.log('🔐 Registering production authentication routes...');

    // Enhanced auth check with detailed session debugging
    this.app.get('/api/auth/user', async (req: any, res) => {
      try {
        const userId = req.session?.userId;
        
        console.log('🔍 AUTH CHECK DEBUG:', {
          sessionId: req.sessionID,
          hasSession: !!req.session,
          sessionUserId: userId,
          sessionData: req.session,
          cookieHeader: req.headers.cookie,
          sessionStore: req.sessionStore ? 'available' : 'missing',
          isEmergencyAdmin: userId === 'admin-emergency-id',
          emergencyLogin: req.session?.emergencyLogin,
          DUAL_COOKIE_CHECK: req.headers.cookie?.includes('musobuddy.sid') ? 'LEGACY_COOKIE_DETECTED' : 'CLEAN'
        });
        
        if (!userId) {
          console.log('❌ No session userId found - session details:', {
            sessionExists: !!req.session,
            sessionKeys: req.session ? Object.keys(req.session) : 'no session',
            sessionId: req.sessionID
          });
          return res.status(401).json({ error: 'Not authenticated' });
        }

        // Handle emergency admin session
        if (userId === 'admin-emergency-id' && req.session.emergencyLogin) {
          console.log('✅ EMERGENCY admin session authenticated:', req.session.email);
          return res.json({
            id: 'admin-emergency-id',
            email: req.session.email,
            firstName: 'Admin',
            lastName: 'User',
            phoneVerified: true,
            onboardingCompleted: true,
            tier: 'admin',
            isAdmin: true,
            isSubscribed: true,
            isLifetime: true
          });
        }

        const user = await storage.getUserById(userId);
        if (!user) {
          console.log('❌ User not found for ID:', userId);
          req.session.destroy(() => {});
          return res.status(401).json({ error: 'User not found' });
        }

        console.log('✅ User authenticated successfully:', user.email);
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneVerified: user.phoneVerified,
          onboardingCompleted: user.onboardingCompleted || false,
          tier: user.tier || 'trial',
          isAdmin: user.isAdmin || false,
          isSubscribed: user.isSubscribed || false,
          isLifetime: user.isLifetime || false
        });
      } catch (error: any) {
        console.error('❌ Auth user error:', error);
        res.status(500).json({ error: 'Authentication failed' });
      }
    });

    // FIXED: Emergency bulletproof admin login endpoint - SINGLE DEFINITION
    this.app.post('/api/auth/admin-login', async (req: any, res) => {
      const loginId = Date.now().toString();
      console.log(`🚨 EMERGENCY ADMIN LOGIN START - ${loginId}`);
      console.log('Request body:', req.body);
      console.log('Session before:', req.session);
      console.log('Session ID:', req.sessionID);
      
      try {
        const { email, password } = req.body;
        console.log(`📧 Email: ${email}, Password provided: ${!!password}`);

        // Emergency hardcoded check for admin
        if (email === 'timfulker@gmail.com' && password === 'MusoBuddy2025!') {
          console.log(`🔑 EMERGENCY: Using hardcoded admin credentials`);
          
          // CRITICAL FIX: Set session data directly without regeneration
          req.session.userId = 'admin-emergency-id';
          req.session.isAdmin = true;
          req.session.email = email;
          req.session.emergencyLogin = true;
      
          console.log(`💾 EMERGENCY: Session data set:`, {
            userId: req.session.userId,
            isAdmin: req.session.isAdmin,
            email: req.session.email,
            sessionId: req.sessionID
          });

          // Force session save with our unified function
          try {
            await this.saveSession(req);
            
            console.log(`✅ EMERGENCY: Session saved successfully`);
            console.log(`🔍 EMERGENCY: Final session check:`, req.session);
            
            return res.json({
              success: true,
              requiresVerification: false,
              message: 'EMERGENCY Admin login successful',
              sessionInfo: {
                sessionId: req.sessionID,
                userId: req.session.userId,
                isAdmin: req.session.isAdmin
              },
              user: {
                id: 'admin-emergency-id',
                email: email,
                firstName: 'Admin',
                lastName: 'User',
                tier: 'admin',
                isAdmin: true,
                isSubscribed: true,
                isLifetime: true,
                phoneVerified: true
              }
            });
          } catch (saveError) {
            console.error(`❌ EMERGENCY: Session save failed:`, saveError);
            return res.status(500).json({ error: 'Session save failed' });
          }
        }

        // If not hardcoded admin, reject immediately
        console.log(`❌ EMERGENCY: Not hardcoded admin credentials`);
        return res.status(401).json({ error: 'Emergency mode: only hardcoded admin allowed' });

      } catch (error: any) {
        console.error(`❌ [ADMIN-${loginId}] Admin login error:`, error);
        res.status(500).json({ error: 'Admin login failed' });
      }
    });

    console.log('✅ Production authentication routes registered');
  }
}