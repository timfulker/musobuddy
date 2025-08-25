import type { Express } from "express";
import { authenticateWithFirebase, authenticateWithFirebasePaid, type AuthenticatedRequest } from '../middleware/firebase-auth';

export function registerTestFirebaseRoutes(app: Express) {
  console.log('🧪 Setting up Firebase authentication test routes...');

  // Test basic Firebase authentication
  app.get('/api/test/firebase-auth', authenticateWithFirebase, async (req: AuthenticatedRequest, res) => {
    res.json({
      success: true,
      message: 'Firebase authentication working!',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        username: req.user?.username,
        isAdmin: req.user?.isAdmin,
        firebaseUid: req.user?.firebaseUid
      }
    });
  });

  // Test paid Firebase authentication
  app.get('/api/test/firebase-auth-paid', authenticateWithFirebasePaid, async (req: AuthenticatedRequest, res) => {
    res.json({
      success: true,
      message: 'Firebase paid authentication working!',
      user: {
        id: req.user?.id,
        email: req.user?.email,
        username: req.user?.username,
        isAdmin: req.user?.isAdmin,
        hasActiveSubscription: true
      }
    });
  });

  console.log('✅ Firebase authentication test routes configured');
}