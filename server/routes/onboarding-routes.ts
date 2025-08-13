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

      // Validate required fields
      if (!onboardingData.businessName || !onboardingData.firstName || !onboardingData.emailPrefix) {
        return res.status(400).json({ error: 'Missing required fields: businessName, firstName, emailPrefix' });
      }

      // Check if email prefix is already taken
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
      await storage.updateUserSettings(userId, {
        businessName: onboardingData.businessName,
        businessAddress: onboardingData.businessAddress,
        city: onboardingData.city,
        postcode: onboardingData.postcode,
        musicGenre: onboardingData.musicGenre,
        instrumentsServices: onboardingData.instrumentsServices,
        yearsExperience: onboardingData.yearsExperience,
        serviceAreas: onboardingData.serviceAreas,
        
        // Pricing information
        standardRate: parseFloat(onboardingData.standardRate) || 0,
        weddingRate: parseFloat(onboardingData.weddingRate) || 0,
        corporateRate: parseFloat(onboardingData.corporateRate) || 0,
        travelRate: parseFloat(onboardingData.travelRate) || 0.25,
        minimumBookingFee: parseFloat(onboardingData.minimumBookingFee) || 0,
        depositPercentage: parseInt(onboardingData.depositPercentage) || 25,
        
        // Branding
        themeColor: onboardingData.selectedTheme || 'midnight-blue',
        businessDescription: onboardingData.businessDescription || ''
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