import type { Express } from "express";
import { storage } from "../core/storage";
import { authenticateWithSupabase, type SupabaseAuthenticatedRequest } from '../middleware/supabase-auth';

export function registerOnboardingRoutes(app: Express) {
  // Complete onboarding
  app.post('/api/onboarding/complete', authenticateWithSupabase, async (req: SupabaseAuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      const onboardingData = req.body;

      console.log('📋 Completing onboarding for user:', userId);
      console.log('📋 Onboarding data received:', JSON.stringify(onboardingData, null, 2));

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Validate required fields for simplified onboarding
      if (!onboardingData.addressLine1 || !onboardingData.city || !onboardingData.postcode || 
          !onboardingData.emailPrefix || !onboardingData.businessContactEmail) {
        return res.status(400).json({ error: 'Missing required fields: address, city, postcode, emailPrefix, businessContactEmail' });
      }

      // Check if email prefix is already taken by another user
      const existingUser = await storage.getUserByEmailPrefix(onboardingData.emailPrefix);
      console.log('🔍 Email prefix check:', {
        emailPrefix: onboardingData.emailPrefix,
        existingUser: existingUser ? { id: existingUser.id, email: existingUser.email } : null,
        currentUserId: userId,
        idsMatch: existingUser ? (existingUser.id === userId) : 'no existing user'
      });
      
      if (existingUser && existingUser.id !== userId) {
        console.log('❌ Email prefix conflict detected');
        return res.status(400).json({ error: 'Email prefix already taken. Please choose another.' });
      }

      // Update user profile with onboarding data  
      const updatedUser = await storage.updateUser(userId, {
        email: onboardingData.businessContactEmail, // Update business email
        emailPrefix: onboardingData.emailPrefix, // CRITICAL for booking emails
        onboardingCompleted: true
      });

      // Create user settings with essential business information
      await storage.updateSettings(userId, {
        // Address information
        addressLine1: onboardingData.addressLine1,
        addressLine2: onboardingData.addressLine2 || '',
        city: onboardingData.city,
        postcode: onboardingData.postcode,
        
        // Email setup
        businessContactEmail: onboardingData.businessContactEmail,
        emailFromName: onboardingData.emailPrefix, // For backwards compatibility
        
        // Bank details as JSON
        bankDetails: JSON.stringify({
          bankName: onboardingData.bankName || '',
          accountName: onboardingData.accountName || '',
          accountNumber: onboardingData.accountNumber || '',
          sortCode: onboardingData.sortCode || ''
        }),
        
        // Default theme
        themeAccentColor: 'midnight-blue'
      });

      console.log('✅ Onboarding completed successfully for user:', userId);

      res.json({ 
        success: true, 
        message: 'Onboarding completed successfully',
        user: updatedUser
      });

    } catch (error) {
      console.error('❌ Failed to complete onboarding:', error);
      res.status(500).json({ 
        error: 'Failed to complete onboarding',
        details: error.message 
      });
    }
  });

  // Get onboarding status
  app.get('/api/onboarding/status', authenticateWithSupabase, async (req: SupabaseAuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check Stripe verification status (show onboarding for any authenticated user)
      const stripeVerified = true; // Allow onboarding for all authenticated users

      res.json({
        onboardingCompleted: user.onboardingCompleted || false,
        stripeVerified: stripeVerified || false,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber
        }
      });

    } catch (error) {
      console.error('❌ Failed to get onboarding status:', error);
      res.status(500).json({ 
        error: 'Failed to get onboarding status',
        details: error.message 
      });
    }
  });
}