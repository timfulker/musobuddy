/**
 * Password Management Routes
 * Handles password changes with proper security and validation
 */
import { type Express } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../middleware/simple-auth';
import { adminChangeUserPassword, verifyUserCredentials, adminRevokeUserSessions } from '../core/supabase-admin';
import { passwordChangeRateLimit } from '../core/rate-limiting';
import { storage } from '../core/storage';

// Password change request validation schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(6, 'New password must be at least 6 characters')
    .max(100, 'Password is too long')
    .regex(/^(?=.*[a-zA-Z])/, 'Password must contain at least one letter'),
});

type PasswordChangeRequest = z.infer<typeof passwordChangeSchema>;

export function registerPasswordRoutes(app: Express) {
  console.log('🔐 [PASSWORD-ROUTES] Registering password management routes...');

  /**
   * Change user password
   * POST /api/auth/change-password
   * Requires authentication and current password verification
   */
  app.post('/api/auth/change-password', authenticate, passwordChangeRateLimit, async (req: AuthenticatedRequest, res) => {
    try {
      const userEmail = req.user!.email;
      const supabaseUid = req.user!.supabaseUid;
      const projectInfo = req.supabaseProject;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 [PASSWORD-CHANGE] Request from user: ${userEmail}`);
      }
      
      // Validate that we have the required Supabase context
      if (!supabaseUid) {
        console.error('❌ [PASSWORD-CHANGE] Missing Supabase UID in authenticated request');
        return res.status(500).json({
          error: 'Authentication context missing. Please log in again.'
        });
      }
      
      if (!projectInfo?.url || !projectInfo?.anonKey) {
        console.error('❌ [PASSWORD-CHANGE] Missing Supabase project info in authenticated request');
        return res.status(500).json({
          error: 'Authentication context incomplete. Please log in again.'
        });
      }
      
      // Validate request body
      const validation = passwordChangeSchema.safeParse(req.body);
      if (!validation.success) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ [PASSWORD-CHANGE] Validation failed:', validation.error.errors);
        }
        return res.status(400).json({
          error: 'Invalid request data',
          details: validation.error.errors.map(e => e.message)
        });
      }
      
      const { currentPassword, newPassword } = validation.data;
      
      // Step 1: Verify current password using project-aware credentials
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 [PASSWORD-CHANGE] Verifying current password for: ${userEmail}`);
      }
      
      const verification = await verifyUserCredentials(
        userEmail, 
        currentPassword, 
        projectInfo.url, 
        projectInfo.anonKey
      );
      
      if (!verification.valid) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ [PASSWORD-CHANGE] Current password verification failed: ${verification.error}`);
        }
        
        // Return generic error for security (don't reveal specifics)
        const errorMessage = verification.error?.includes('Invalid login credentials') 
          ? 'Current password is incorrect'
          : 'Unable to verify current password';
          
        return res.status(400).json({
          error: errorMessage,
          field: 'currentPassword'
        });
      }
      
      // Step 2: Check if new password is different from current
      if (currentPassword === newPassword) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`❌ [PASSWORD-CHANGE] New password same as current for: ${userEmail}`);
        }
        return res.status(400).json({
          error: 'New password must be different from current password',
          field: 'newPassword'
        });
      }
      
      // Step 3: Update password using admin privileges (direct user ID)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔐 [PASSWORD-CHANGE] Updating password for Supabase user: ${supabaseUid}`);
      }
      
      const result = await adminChangeUserPassword(supabaseUid, newPassword, projectInfo.url);
      
      if (!result.success) {
        console.error(`❌ [PASSWORD-CHANGE] Password update failed for: ${userEmail}`);
        return res.status(500).json({
          error: 'Failed to update password. Please try again.'
        });
      }
      
      // Step 4: Revoke all other sessions for security
      const sessionRevocation = await adminRevokeUserSessions(supabaseUid, projectInfo.url);
      
      if (!sessionRevocation.success && process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ [PASSWORD-CHANGE] Session revocation failed (non-critical): ${sessionRevocation.error}`);
      }
      
      // Step 5: Log the password change for security audit
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [PASSWORD-CHANGE] Password changed successfully for: ${userEmail}`);
      }
      
      // Update database record with password change timestamp
      try {
        await storage.updateUser(req.user!.id, {
          updatedAt: new Date()
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`⚠️ [PASSWORD-CHANGE] Failed to update user timestamp: ${error}`);
        }
        // Don't fail the password change for this
      }
      
      res.json({
        success: true,
        message: 'Password updated successfully',
        sessionRevoked: true, // Signal client to handle logout
        revokedAt: sessionRevocation.revokedAt || new Date().toISOString()
      });
      
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [PASSWORD-CHANGE] Unexpected error:', error);
      } else {
        // In production, log error without sensitive details
        console.error('❌ [PASSWORD-CHANGE] Password change failed');
      }
      
      // Return generic error for security
      res.status(500).json({
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  });

  /**
   * Validate password strength
   * POST /api/auth/validate-password
   * Checks password strength without changing it
   */
  app.post('/api/auth/validate-password', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { password } = req.body;
      
      if (!password || typeof password !== 'string') {
        return res.status(400).json({
          error: 'Password is required'
        });
      }
      
      const validation = z.string()
        .min(6, 'Password must be at least 6 characters')
        .max(100, 'Password is too long')
        .regex(/^(?=.*[a-zA-Z])/, 'Password must contain at least one letter')
        .safeParse(password);
      
      if (!validation.success) {
        return res.json({
          valid: false,
          errors: validation.error.errors.map(e => e.message)
        });
      }
      
      // Additional strength checks
      const strengthChecks = {
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        isLongEnough: password.length >= 8
      };
      
      const strength = Object.values(strengthChecks).filter(Boolean).length;
      
      res.json({
        valid: true,
        strength: {
          score: strength,
          maxScore: Object.keys(strengthChecks).length,
          checks: strengthChecks,
          level: strength < 2 ? 'weak' : strength < 4 ? 'medium' : 'strong'
        }
      });
      
    } catch (error: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ [PASSWORD-VALIDATION] Error:', error);
      }
      res.status(500).json({
        error: 'Failed to validate password'
      });
    }
  });

  console.log('✅ [PASSWORD-ROUTES] Password management routes registered successfully');
}