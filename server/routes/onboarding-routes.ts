import type { Express } from "express";
import { storage } from "../core/storage";
import { requireAuth } from "../middleware/auth";

export function registerOnboardingRoutes(app: Express) {
  // Complete onboarding
  app.post('/api/onboarding/complete', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      const onboardingData = req.body;

      console.log('📋 Completing onboarding for user:', userId);
      console.log('📋 Onboarding data received:', JSON.stringify(onboardingData, null, 2));

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      // Validate required fields (businessName is now optional)
      if (!onboardingData.firstName || !onboardingData.emailPrefix) {
        return res.status(400).json({ error: 'Missing required fields: firstName, emailPrefix' });
      }

      // Check if email prefix is already taken by another user
      const existingUser = await storage.getUserByEmailPrefix(onboardingData.emailPrefix);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Email prefix already taken. Please choose another.' });
      }

      // Update user profile with onboarding data  
      const updatedUser = await storage.updateUser(userId, {
        firstName: onboardingData.firstName,
        lastName: onboardingData.lastName,
        phoneNumber: onboardingData.phoneNumber,
        emailPrefix: onboardingData.emailPrefix, // CRITICAL for booking emails
        onboardingCompleted: true
      });

      // Create user settings with business information
      await storage.updateSettings(userId, {
        businessName: onboardingData.businessName || `${onboardingData.firstName} ${onboardingData.lastName}`,
        addressLine1: onboardingData.addressLine1 || '',
        addressLine2: onboardingData.addressLine2 || '',
        city: onboardingData.city || '',
        postcode: onboardingData.postcode || '',
        country: onboardingData.country || 'United Kingdom',
        instrumentsServices: onboardingData.instrumentsServices || '',
        
        // Pricing information
        standardRate: parseFloat(onboardingData.standardRate) || 0,
        weddingRate: parseFloat(onboardingData.weddingRate) || 0,
        corporateRate: parseFloat(onboardingData.corporateRate) || 0,
        travelRate: parseFloat(onboardingData.travelRate) || 0.25,
        minimumBookingFee: parseFloat(onboardingData.minimumBookingFee) || 0,
        depositPercentage: parseInt(onboardingData.depositPercentage) || 25,
        
        // Branding - use themeAccentColor to match the settings page
        themeAccentColor: onboardingData.selectedTheme || 'midnight-blue'
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
  app.get('/api/onboarding/status', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        onboardingCompleted: user.onboardingCompleted || false,
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