/**
 * Admin routes for bulk re-processing and system maintenance
 */

import { type Express } from 'express';
import { storage } from '../core/storage';
import { userStorage } from '../storage/user-storage';
import { authenticate, type AuthenticatedRequest } from '../middleware/supabase-only-auth';
import { adminCreateUser } from '../core/supabase-admin';

// Export the registration function for the routes/index.ts file
export async function registerAdminRoutes(app: Express) {
  
// Manual re-process selected bookings endpoint  
app.post('/api/admin/reprocess-bookings', authenticate, async (req: AuthenticatedRequest, res) => {
  // Check admin permissions
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { bookingIds } = req.body;
    
    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return res.status(400).json({ 
        error: 'bookingIds array is required and must not be empty' 
      });
    }
    
    console.log(`🔄 [ADMIN] Re-processing ${bookingIds.length} selected bookings: ${bookingIds.join(', ')}`);
    
    let bookingsToProcess = [];
    
    // Re-process specific booking IDs
    for (const id of bookingIds) {
      const booking = await storage.getBooking(id);
      if (booking) {
        bookingsToProcess.push(booking);
      } else {
        console.log(`⚠️ [ADMIN] Booking #${id} not found`);
      }
    }
    
    console.log(`🔄 [ADMIN] Found ${bookingsToProcess.length} bookings to re-process`);
    
    const results = {
      total: bookingsToProcess.length,
      processed: 0,
      failed: 0,
      improved: 0,
      errors: []
    };
    
    // Process each booking
    for (const booking of bookingsToProcess) {
      try {
        console.log(`🔄 [ADMIN] Re-processing booking #${booking.id}: "${booking.title}"`);
        
        // Skip if no original email content
        if (!booking.notes || booking.notes.trim().length < 10) {
          console.log(`⚠️ [ADMIN] Skipping booking #${booking.id} - no email content in notes`);
          results.failed++;
          results.errors.push(`Booking #${booking.id}: No email content available`);
          continue;
        }
        
        // Store original data for comparison
        const originalData = {
          title: booking.title,
          venue: booking.venue,
          eventDate: booking.eventDate,
          eventTime: booking.eventTime,
          clientName: booking.clientName,
          clientEmail: booking.clientEmail,
          clientPhone: booking.clientPhone,
          fee: booking.fee,
          applyNowLink: booking.applyNowLink
        };
        
        // Re-parse the email content using the same AI system
        const { parseBookingMessage } = await import('../ai/booking-message-parser');
        const { cleanEncoreTitle } = await import('../core/booking-formatter');
        
        // Extract email data from the original notes - FORCE FRESH PARSING
        const emailBody = booking.notes;
        // DON'T use existing wrong client data - let AI extract fresh from email content
        
        console.log(`🤖 [ADMIN] Running FRESH AI re-parsing for booking #${booking.id} (ignoring existing data)`);
        console.log(`🤖 [ADMIN] Email content to re-parse:`, emailBody.substring(0, 200));
        const parsedData = await parseBookingMessage(emailBody, null, null, booking.userId);
        
        console.log(`🔍 [ADMIN] AI parsed data for booking #${booking.id}:`, {
          clientName: parsedData.clientName,
          clientEmail: parsedData.clientEmail,
          eventDate: parsedData.eventDate,
          venue: parsedData.venue
        });
        
        // Apply title cleanup for Encore bookings
        const cleanedTitle = cleanEncoreTitle(parsedData.eventTitle || parsedData.title || booking.title);
        
        // Build updated booking data, PRIORITIZING AI parsed data over existing wrong data
        const updatedData = {
          title: parsedData.eventTitle || parsedData.title || cleanedTitle || booking.title,
          venue: parsedData.venue || booking.venue,
          venueAddress: parsedData.venueAddress || booking.venueAddress,
          eventDate: parsedData.eventDate || booking.eventDate,
          eventTime: parsedData.eventTime || booking.eventTime,
          eventEndTime: parsedData.eventEndTime || booking.eventEndTime,
          // CRITICAL: Use AI parsed client data (don't fall back to existing wrong data)
          clientName: parsedData.clientName || booking.clientName,
          clientEmail: parsedData.clientEmail || booking.clientEmail,
          clientPhone: parsedData.clientPhone || booking.clientPhone,
          fee: parsedData.fee || booking.fee,
          deposit: parsedData.deposit || booking.deposit,
          gigType: parsedData.eventType || booking.gigType,
          specialRequirements: parsedData.specialRequirements || booking.specialRequirements,
          applyNowLink: parsedData.applyNowLink || booking.applyNowLink,
          // Keep original notes and other fields unchanged
          notes: booking.notes,
          status: booking.status,
          createdAt: booking.createdAt
        };
        
        // Check if we actually improved the data
        let hasImprovement = false;
        const improvements = [];
        
        if (updatedData.title !== originalData.title && updatedData.title !== 'Event') {
          hasImprovement = true;
          improvements.push(`Title: "${originalData.title}" → "${updatedData.title}"`);
        }
        
        if (updatedData.venue !== originalData.venue && updatedData.venue) {
          hasImprovement = true;
          improvements.push(`Venue: "${originalData.venue || 'None'}" → "${updatedData.venue}"`);
        }
        
        if (updatedData.eventDate !== originalData.eventDate && updatedData.eventDate) {
          hasImprovement = true;
          improvements.push(`Event Date: "${originalData.eventDate || 'None'}" → "${updatedData.eventDate}"`);
        }
        
        if (updatedData.clientName !== originalData.clientName && updatedData.clientName) {
          hasImprovement = true;
          improvements.push(`Client Name: "${originalData.clientName || 'None'}" → "${updatedData.clientName}"`);
        }
        
        if (updatedData.clientEmail !== originalData.clientEmail && updatedData.clientEmail) {
          hasImprovement = true;
          improvements.push(`Client Email: "${originalData.clientEmail || 'None'}" → "${updatedData.clientEmail}"`);
        }
        
        if (updatedData.applyNowLink !== originalData.applyNowLink && updatedData.applyNowLink) {
          hasImprovement = true;
          improvements.push(`Apply Now Link: Added`);
        }
        
        if (updatedData.fee !== originalData.fee && updatedData.fee) {
          hasImprovement = true;
          improvements.push(`Fee: "${originalData.fee || 'None'}" → "${updatedData.fee}"`);
        }
        
        if (hasImprovement) {
          // Update the booking with improved data (FIXED: Added missing userId parameter)
          await storage.updateBooking(booking.id, updatedData, booking.userId);
          console.log(`✅ [ADMIN] Improved booking #${booking.id}:`, improvements);
          results.improved++;
        } else {
          console.log(`ℹ️ [ADMIN] No improvements found for booking #${booking.id}`);
        }
        
        results.processed++;
        
        // Small delay to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error: any) {
        console.error(`❌ [ADMIN] Failed to re-process booking #${booking.id}:`, error);
        results.failed++;
        results.errors.push(`Booking #${booking.id}: ${error.message}`);
      }
    }
    
    console.log(`🎉 [ADMIN] Bulk re-processing complete:`, results);
    
    res.json({
      success: true,
      message: 'Bulk re-processing completed',
      results
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Bulk re-processing failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get list of problematic bookings for review
app.get('/api/admin/problematic-bookings', authenticate, async (req: AuthenticatedRequest, res) => {
  // Check admin permissions
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const allBookings = await storage.getAllBookings();
    
    const problematicBookings = allBookings.filter(booking => {
      return (
        booking.title === 'Event' || 
        booking.title === 'Booking' ||
        booking.title?.startsWith('Inquiry') ||
        !booking.venue ||
        !booking.eventDate ||
        (booking.clientName === 'Encore Musicians' && !booking.applyNowLink)
      );
    }).map(booking => ({
      id: booking.id,
      title: booking.title,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      venue: booking.venue,
      eventDate: booking.eventDate,
      createdAt: booking.createdAt,
      issues: []
    }));
    
    // Identify specific issues for each booking
    problematicBookings.forEach(booking => {
      if (booking.title === 'Event' || booking.title === 'Booking') {
        booking.issues.push('Generic title');
      }
      if (!booking.venue) {
        booking.issues.push('Missing venue');
      }
      if (!booking.eventDate) {
        booking.issues.push('Missing event date');
      }
      if (booking.clientName === 'Encore Musicians' && !booking.applyNowLink) {
        booking.issues.push('Missing Encore apply link');
      }
    });
    
    res.json({
      success: true,
      count: problematicBookings.length,
      bookings: problematicBookings
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to get problematic bookings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Link Firebase UID to existing database user
app.post('/api/admin/link-firebase-user', authenticate, async (req: AuthenticatedRequest, res) => {
  // Check admin permissions
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { email, firebaseUid } = req.body;
    
    if (!email || !firebaseUid) {
      return res.status(400).json({ 
        error: 'Email and firebaseUid are required' 
      });
    }
    
    console.log(`🔗 [ADMIN] Linking Firebase UID to user: ${email}`);
    
    // Find the existing user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ 
        error: `User with email ${email} not found in database` 
      });
    }
    
    // Check if Firebase UID is already linked to another user
    const existingFirebaseUser = await storage.getUserByFirebaseUid(firebaseUid);
    if (existingFirebaseUser && existingFirebaseUser.id !== user.id) {
      return res.status(409).json({ 
        error: `Firebase UID ${firebaseUid} is already linked to another user: ${existingFirebaseUser.email}` 
      });
    }
    
    // Update the user record with Firebase UID
    await storage.updateUser(user.id, { firebaseUid });
    
    console.log(`✅ [ADMIN] Successfully linked Firebase UID ${firebaseUid} to user ${email} (ID: ${user.id})`);
    
    res.json({
      success: true,
      message: `Firebase account linked to ${email}`,
      user: {
        id: user.id,
        email: user.email,
        firebaseUid: firebaseUid
      }
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to link Firebase user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create new user endpoint for admin panel - CRITICAL SECURITY ENDPOINT
app.post('/api/admin/users', authenticate, async (req: AuthenticatedRequest, res) => {
  // SECURITY: Check admin permissions - CRITICAL to prevent privilege escalation
  if (!req.user?.isAdmin) {
    console.log(`🚫 [ADMIN] Non-admin user ${req.user?.email} attempted to create user - BLOCKED`);
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    const { 
      email, 
      firstName, 
      lastName, 
      password, 
      firebaseUid, 
      tier, 
      isAdmin, 
      isBetaTester, 
      phoneVerified,
      bypassPayment  // New: Clean flag to bypass all payment verification
    } = req.body;
    
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ 
        error: 'Email, first name, last name, and password are required' 
      });
    }
    
    console.log(`🔧 [ADMIN] Creating new user: ${email}`);
    if (bypassPayment) {
      console.log(`💰 [ADMIN] Payment bypass enabled for user: ${email}`);
    }
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: `User with email ${email} already exists` 
      });
    }
    
    let supabaseUid = null;
    
    // Create user in Supabase authentication
    try {
      console.log(`🏠 [ADMIN] Creating Supabase user for ${email}`);
      const supabaseResult = await adminCreateUser(
        email, 
        password, 
        firstName, 
        lastName, 
        isAdmin || false
      );
      supabaseUid = supabaseResult.supabaseUid;
      console.log(`✅ [ADMIN] Created Supabase user ${supabaseUid} for ${email}`);
    } catch (supabaseError: any) {
      console.error(`❌ [ADMIN] Failed to create Supabase user for ${email}:`, supabaseError.message);
      return res.status(500).json({ 
        error: `Failed to create Supabase user: ${supabaseError.message}` 
      });
    }
    
    // Check if Supabase UID is already linked (safety check)
    if (supabaseUid) {
      const existingSupabaseUser = await storage.getUserBySupabaseUid(supabaseUid);
      if (existingSupabaseUser) {
        return res.status(409).json({ 
          error: `Supabase UID ${supabaseUid} is already linked to another user: ${existingSupabaseUser.email}` 
        });
      }
    }
    
    // Hash password
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate user ID
    const { nanoid } = await import('nanoid');
    const userId = nanoid();
    
    // Create user data
    const userData = {
      id: userId,
      email,
      firstName,
      lastName,
      password: hashedPassword,
      supabaseUid: supabaseUid || null,
      tier: tier || null,
      isAdmin: isAdmin || false,
      isBetaTester: isBetaTester || false,
      phoneVerified: phoneVerified || false,
      isActive: true,
      onboardingCompleted: false,
      createdByAdmin: true,  // IMPORTANT: Mark admin-created users
      // Payment bypass flags - set both for complete bypass
      isAssigned: bypassPayment || false,  // Admin granted free access
      hasPaid: bypassPayment || false,     // Mark as paid to bypass all payment checks
      trialEndsAt: bypassPayment ? null : undefined  // No trial expiration if payment bypassed
    };
    
    // Create user in database
    const newUser = await storage.createUser(userData);
    
    console.log(`✅ [ADMIN] Successfully created user ${email} (ID: ${userId})`);
    
    // User was already created in Supabase with email verification enabled
    console.log(`🔗 [ADMIN] Supabase user ${supabaseUid} created with email verification enabled`);
    
    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        tier: newUser.tier,
        isAdmin: newUser.isAdmin,
        isBetaTester: newUser.isBetaTester,
        supabaseUid: newUser.supabaseUid,
        isAssigned: newUser.isAssigned,
        hasPaid: newUser.hasPaid,
        paymentBypassed: bypassPayment || false
      }
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to create user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all users endpoint for admin panel
app.get('/api/admin/users', authenticate, async (req: AuthenticatedRequest, res) => {
  // Check admin permissions
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    console.log('📋 [ADMIN] Fetching all users for admin panel');
    
    const allUsers = await storage.getAllUsers();
    
    // Return user data without sensitive information
    const sanitizedUsers = allUsers.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tier: user.tier,
      isAdmin: user.isAdmin,
      isBetaTester: user.isBetaTester,
      betaStartDate: user.betaStartDate,
      betaEndDate: user.betaEndDate,
      betaFeedbackCount: user.betaFeedbackCount,
      createdAt: user.createdAt,
      firebaseUid: user.firebaseUid
    }));
    
    res.json(sanitizedUsers);
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to fetch users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get admin overview endpoint
app.get('/api/admin/overview', authenticate, async (req: AuthenticatedRequest, res) => {
  // Check admin permissions
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  try {
    console.log('📊 [ADMIN] Fetching admin overview');
    
    // Get basic counts
    const totalUsers = await storage.getTotalUserCount();
    const totalBookings = await storage.getTotalBookingCount();
    const totalContracts = await storage.getTotalContractCount();
    const totalInvoices = await storage.getTotalInvoiceCount();
    
    res.json({
      totalUsers,
      totalBookings,
      totalContracts,
      totalInvoices,
      systemHealth: 'healthy',
      databaseStatus: 'connected'
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to fetch overview:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update user endpoint - UPDATED for Supabase password support
app.patch('/api/admin/users/:userId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      console.log(`❌ [ADMIN] Non-admin user ${req.user?.email} attempted to update user`);
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const userData = req.body;

    console.log(`📝 [ADMIN] Admin ${req.user.email} updating user ${userId}:`, {
      ...userData,
      password: userData.password ? '[PROVIDED]' : '[NOT PROVIDED]'
    });

    // Get existing user to check for Supabase UID
    const existingUser = await storage.getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Handle password change with Supabase if password is provided and user has Supabase UID
    if (userData.password && userData.password.trim()) {
      if (existingUser.supabaseUid) {
        try {
          console.log(`🔐 [ADMIN] Updating Supabase password for user ${userId} (${existingUser.email})`);
          
          // Import the admin password change and session revocation functions
          const { adminChangeUserPassword, adminRevokeUserSessions } = await import('../core/supabase-admin');
          
          // Get project URL from environment (this should match current auth setup)
          const projectUrl = process.env.NODE_ENV === 'development' 
            ? process.env.SUPABASE_URL_DEV 
            : process.env.SUPABASE_URL_PROD;
          
          // Change password in Supabase auth
          await adminChangeUserPassword(existingUser.supabaseUid, userData.password, projectUrl);
          
          console.log(`✅ [ADMIN] Successfully updated Supabase password for user ${userId}`);
          
          // SECURITY: Revoke all existing sessions after password change
          try {
            console.log(`🔒 [ADMIN] Revoking all sessions for user ${userId} after password change`);
            await adminRevokeUserSessions(existingUser.supabaseUid, projectUrl);
            console.log(`✅ [ADMIN] Successfully revoked sessions for user ${userId}`);
          } catch (sessionError: any) {
            console.warn(`⚠️ [ADMIN] Session revocation failed for user ${userId} (non-critical): ${sessionError.message}`);
            // Continue - session revocation failure shouldn't block password change
          }
          
        } catch (supabaseError: any) {
          console.error(`❌ [ADMIN] Failed to update Supabase password for user ${userId}:`, supabaseError.message);
          return res.status(500).json({ 
            error: `Failed to update password in authentication system: ${supabaseError.message}` 
          });
        }
      } else {
        console.log(`⚠️ [ADMIN] User ${userId} has no Supabase UID - only updating local database password`);
      }
    } else {
      // Remove password from userData if empty to avoid overwriting with empty string
      if (userData.password === '') {
        delete userData.password;
      }
    }

    // Update the user in local database (this will hash password if provided)
    await storage.updateUser(userId, userData);

    // Get the updated user to return
    const updatedUser = await storage.getUserById(userId);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found after update' });
    }

    // Remove sensitive data from response
    const userResponse = {
      ...updatedUser,
      password: undefined // Don't send password hash back
    };

    console.log(`✅ [ADMIN] Successfully updated user ${userId}`);
    res.json(userResponse);

  } catch (error: any) {
    console.error(`❌ [ADMIN] Failed to update user:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all locked users
app.get('/api/admin/locked-users', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const lockedUsers = await userStorage.getLockedUsers();
    console.log(`📊 [ADMIN] Retrieved ${lockedUsers.length} locked users for admin ${req.user.email}`);
    
    res.json({ 
      success: true, 
      lockedUsers,
      count: lockedUsers.length 
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to get locked users:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Lock user account
app.post('/api/admin/lock-user', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, hours, reason } = req.body;
    
    if (!userId || !hours) {
      return res.status(400).json({ 
        error: 'userId and hours are required' 
      });
    }

    // Calculate lock expiry time
    const lockedUntil = new Date();
    lockedUntil.setHours(lockedUntil.getHours() + parseInt(hours));

    await userStorage.lockUser(userId, lockedUntil, reason);
    
    console.log(`🔒 [ADMIN] Admin ${req.user.email} locked user ${userId} until ${lockedUntil.toISOString()}`);
    
    res.json({
      success: true,
      message: `User locked until ${lockedUntil.toLocaleString()}`,
      lockedUntil: lockedUntil.toISOString()
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to lock user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Unlock user account
app.post('/api/admin/unlock-user', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    await userStorage.unlockUser(userId);
    
    console.log(`🔓 [ADMIN] Admin ${req.user.email} unlocked user ${userId}`);
    
    res.json({
      success: true,
      message: 'User account unlocked'
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to unlock user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retrieve specific Mailgun stored message
app.post('/api/admin/mailgun-message', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { storageKey } = req.body;
    
    if (!storageKey) {
      return res.status(400).json({ 
        error: 'storageKey is required' 
      });
    }

    const mailgunDomain = 'enquiries.musobuddy.com';
    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const storageUrl = `https://storage-europe-west1.api.mailgun.net/v3/domains/${mailgunDomain}/messages/${storageKey}`;
    
    console.log(`📧 [ADMIN] Fetching Mailgun message: ${storageKey}`);
    
    // Fetch the message from Mailgun storage
    const response = await fetch(storageUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString('base64')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Mailgun API error: ${response.status} ${response.statusText}`);
    }

    const messageData = await response.json();
    
    console.log(`✅ [ADMIN] Retrieved message: ${messageData.subject || 'No Subject'}`);
    
    res.json({
      success: true,
      message: messageData
    });
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to retrieve Mailgun message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== BETA INVITE CODE MANAGEMENT =====

// Get all beta invite codes
app.get('/api/admin/beta-codes', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('📋 [ADMIN] Fetching all beta invite codes');
    
    const betaCodes = await storage.getAllBetaInviteCodes();
    
    res.json({
      success: true,
      betaCodes
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to fetch beta codes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a new beta invite code
app.post('/api/admin/beta-codes', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { code, maxUses, trialDays, description, expiresAt } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        error: 'Code is required' 
      });
    }

    console.log(`🎫 [ADMIN] Creating beta invite code: ${code}`);
    
    // Check if code already exists
    const existingCode = await storage.getBetaInviteCodeByCode(code);
    if (existingCode) {
      return res.status(409).json({ 
        error: 'Code already exists' 
      });
    }

    const newCode = await storage.createBetaInviteCode({
      code,
      maxUses: maxUses || 1,
      trialDays: trialDays || 365,
      description: description || null,
      createdBy: req.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    console.log(`✅ [ADMIN] Beta code created:`, {
      id: newCode.id,
      code: newCode.code,
      maxUses: newCode.maxUses,
      trialDays: newCode.trialDays
    });
    
    res.json({
      success: true,
      betaCode: newCode
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to create beta code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update a beta invite code
app.put('/api/admin/beta-codes/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { status, maxUses, trialDays, description, expiresAt } = req.body;
    
    console.log(`📝 [ADMIN] Updating beta code ID: ${id}`);
    
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (maxUses !== undefined) updates.maxUses = maxUses;
    if (trialDays !== undefined) updates.trialDays = trialDays;
    if (description !== undefined) updates.description = description;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const updatedCode = await storage.updateBetaInviteCode(parseInt(id), updates);
    
    if (!updatedCode) {
      return res.status(404).json({ 
        error: 'Beta code not found' 
      });
    }

    console.log(`✅ [ADMIN] Beta code updated:`, updatedCode.code);
    
    res.json({
      success: true,
      betaCode: updatedCode
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to update beta code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a beta invite code
app.delete('/api/admin/beta-codes/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    
    console.log(`🗑️ [ADMIN] Deleting beta code ID: ${id}`);
    
    const deletedCode = await storage.deleteBetaInviteCode(parseInt(id));
    
    if (!deletedCode) {
      return res.status(404).json({ 
        error: 'Beta code not found' 
      });
    }

    console.log(`✅ [ADMIN] Beta code deleted:`, deletedCode.code);
    
    res.json({
      success: true,
      message: 'Beta code deleted',
      deletedCode
    });
    
  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to delete beta code:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send beta invitation email
app.post('/api/admin/send-beta-email', authenticate, async (req: AuthenticatedRequest, res) => {
  // Check admin permissions
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const { email, firstName, customCode, subject, message, templateId } = req.body;

    if (!email || !firstName || !customCode) {
      return res.status(400).json({
        error: 'Email, firstName, and customCode are required'
      });
    }

    console.log(`📧 [ADMIN] Sending beta invitation to ${email} with code ${customCode}`);

    // Import mailgun client
    const { MailgunAuthService } = await import('../core/mailgun-auth-service');
    const mailgunService = new MailgunAuthService();

    const currentYear = new Date().getFullYear();

    // Get email template (either specified or active)
    let emailTemplate;
    if (templateId) {
      emailTemplate = await storage.getBetaEmailTemplateById(parseInt(templateId));
    } else {
      emailTemplate = await storage.getActiveBetaEmailTemplate();
    }

    // If no template found, use the hardcoded fallback
    let htmlTemplate: string;
    let textTemplate: string;
    let emailSubject: string;

    if (emailTemplate) {
      // Replace template variables in HTML
      htmlTemplate = emailTemplate.htmlBody
        .replace(/\{\{firstName\}\}/g, firstName)
        .replace(/\{\{customCode\}\}/g, customCode)
        .replace(/\{\{currentYear\}\}/g, currentYear.toString())
        .replace(/\{\{message\}\}/g, message || '');

      // Replace template variables in text
      textTemplate = emailTemplate.textBody
        .replace(/\{\{firstName\}\}/g, firstName)
        .replace(/\{\{customCode\}\}/g, customCode)
        .replace(/\{\{currentYear\}\}/g, currentYear.toString())
        .replace(/\{\{message\}\}/g, message || '');

      // Replace template variables in subject
      emailSubject = emailTemplate.subject
        .replace(/\{\{firstName\}\}/g, firstName)
        .replace(/\{\{customCode\}\}/g, customCode);

      console.log(`📧 [ADMIN] Using stored template: ${emailTemplate.name}`);
    } else {
      console.log(`📧 [ADMIN] No template found, using hardcoded fallback`);
      emailSubject = subject || `Welcome to MusoBuddy Beta - Code: ${customCode}`;

      // HTML email template
      htmlTemplate = `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <!--[if mso]>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
          <o:AllowPNG/>
        </o:OfficeDocumentSettings>
      </xml>
    <![endif]-->
    <title>MusoBuddy Beta – 90 Days Free</title>
    <style>
      /* Reset */
      html, body { margin:0 !important; padding:0 !important; height:100% !important; width:100% !important; }
      * { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; }
      table, td { mso-table-lspace:0pt !important; mso-table-rspace:0pt !important; }
      img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; display:block; }
      a { text-decoration:none; }
      /* Base */
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      body { background:#0b0b10; }
      .wrapper { width:100%; background:#0b0b10; }
      .container { width:100%; max-width:640px; margin:0 auto; background:#ffffff; }
      .px { padding-left:32px; padding-right:32px; }
      .py { padding-top:28px; padding-bottom:28px; }
      .lead { font-size:18px; line-height:1.6; color:#111827; }
      .muted { color:#6b7280; font-size:14px; line-height:1.6; }
      .h1 { font-size:28px; line-height:1.25; margin:0 0 8px; color:#111827; font-weight:800; }
      .h2 { font-size:18px; font-weight:700; margin:0 0 8px; color:#111827; }
      .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; background:#f3f4f6; color:#111827; padding:6px 10px; border-radius:6px; display:inline-block; }
      .btn { display:inline-block; font-weight:700; padding:14px 22px; border-radius:10px; background:#6C5CE7; color:#ffffff !important; }
      .btn:hover { opacity:.9; }
      .section { padding:24px 32px; }
      .hr { border:0; height:1px; background:#e5e7eb; margin:24px 0; }
      .center { text-align:center; }
      .footer-link { color:#6b7280 !important; text-decoration:underline; }
      .list li { margin-bottom:8px; }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        .container { background:#0f1115 !important; }
        .h1, .h2, .lead { color:#e5e7eb !important; }
        .muted { color:#9ca3af !important; }
        .code { background:#1f2430 !important; color:#e5e7eb !important; }
        .hr { background:#1f2430 !important; }
      }

      /* Mobile tweaks */
      @media (max-width:480px){
        .px { padding-left:20px !important; padding-right:20px !important; }
        .section { padding:20px !important; }
        .h1 { font-size:24px !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background:#0b0b10;">
    <div role="article" aria-roledescription="email" lang="en" class="wrapper">
      <!-- Preheader (hidden in most clients) -->
      <div style="display:none; max-height:0; overflow:hidden; opacity:0; visibility:hidden; mso-hide:all;">
        Welcome to the MusoBuddy beta! Your custom code gives you 90 days free access.
      </div>

      <!-- Outer container -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%">
        <tr>
          <td align="center" class="px" style="padding-top:32px; padding-bottom:32px;">

            <!-- Card -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="container" style="border-radius:16px; overflow:hidden; box-shadow:0 6px 24px rgba(17,24,39,0.12);">
              <!-- Header / Logo -->
              <tr>
                <td style="background:#111827;" class="py px">
                  <table role="presentation" width="100%">
                    <tr>
                      <td align="left">
                        <!-- Replace with your hosted logo URL if desired -->
                        <div style="font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#ffffff; font-weight:800; font-size:18px; letter-spacing:.2px;">MusoBuddy</div>
                      </td>
                      <td align="right">
                        <span style="font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif; color:#9ca3af; font-size:12px;">Beta Program</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td class="section" style="font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                  <p class="h1">Welcome to the MusoBuddy Beta 🎉</p>
                  <p class="lead">Hi <strong>${firstName}</strong>, thanks for jumping in to help us shape MusoBuddy. Your feedback will directly influence what we build next.</p>

                  <p class="h2">Your 90‑day access code</p>
                  <p class="lead">Use this code at signup to unlock your free trial:</p>
                  <p><span class="code">${customCode}</span></p>

                  <!-- CTA Button (bulletproof for Outlook) -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="center" align="left" style="margin:16px 0 8px;">
                    <tr>
                      <td align="center">
                        <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://www.musobuddy.com/signup" style="height:44px;v-text-anchor:middle;width:280px;" arcsize="10%" stroke="f" fillcolor="#6C5CE7">
                          <w:anchorlock/>
                          <center style="color:#ffffff;font-family:Segoe UI, Arial, sans-serif;font-size:16px;font-weight:700;">Sign up & Redeem</center>
                        </v:roundrect>
                        <![endif]-->
                        <!--[if !mso]><!-- -->
                        <a class="btn" href="https://www.musobuddy.com/signup" target="_blank" style="font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">Sign up &amp; Redeem</a>
                        <!--<![endif]-->
                      </td>
                    </tr>
                  </table>

                  <div style="margin: 32px 0;">&nbsp;</div>

                  <hr class="hr">

                  <p class="h2" style="color:#dc2626;">🔴 First Priority: Email Setup</p>
                  <p class="lead"><strong>Please complete this immediately after signing up:</strong></p>
                  <ol class="lead list" style="padding-left:20px;">
                    <li>Go to <strong>Settings → Email Integration</strong></li>
                    <li>Connect your email account (Gmail, Outlook, or IMAP)</li>
                    <li>Complete the setup wizard</li>
                  </ol>
                  <p class="lead" style="background:#fef2f2; padding:12px; border-radius:6px; border-left:4px solid #dc2626;">
                    <strong>Why this matters:</strong> We'll be sending you dummy booking requests to test the system. Without email integration, you won't receive these test bookings and we can't properly evaluate the app's core functionality.
                  </p>

                  <hr class="hr">

                  <p class="h2">How to give effective feedback</p>
                  <ul class="lead list" style="padding-left:20px;">
                    <li><strong>Be specific:</strong> what you tried, what you expected, what happened.</li>
                    <li><strong>Add screenshots:</strong> capture error messages or odd behaviour.</li>
                    <li><strong>Include browser console logs:</strong> open the console (<em>Mac</em>: <code>⌥⌘J</code>, <em>Windows</em>: <code>Ctrl</code>+<code>Shift</code>+<code>J</code>), reproduce the issue, copy any red errors.</li>
                    <li><strong>Tell us your setup:</strong> device, OS, browser + version, and steps to reproduce.</li>
                    <li><strong>Suggestions welcome:</strong> features or tweaks that would save you time at gigs.</li>
                  </ul>

                  <hr class="hr">

                  <p class="h2">Need help?</p>
                  <p class="lead">Email us at <a href="mailto:support@musobuddy.com" style="color:#6C5CE7; font-weight:600;">support@musobuddy.com</a> or use the in‑app support button. We'll get back to you quickly.</p>

                  ${message ? `<hr class="hr"><p class="h2">Personal Message</p><p class="lead">${message}</p>` : ''}

                  <p class="muted" style="margin-top:16px;">You're receiving this because you opted into the MusoBuddy beta. If this wasn't you, please ignore this message or let us know.</p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td class="py px" style="font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif; background:#f8fafc;">
                  <table role="presentation" width="100%">
                    <tr>
                      <td class="muted" style="font-size:12px;">
                        © ${currentYear} MusoBuddy. All rights reserved.
                        <br>
                        <a href="https://www.musobuddy.com" class="footer-link">musobuddy.com</a>
                        • <a href="https://www.musobuddy.com/signup" class="footer-link">Sign up</a>
                      </td>
                      <td align="right" class="muted" style="font-size:12px;">
                        Bournemouth, UK
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
            <!-- /Card -->

          </td>
        </tr>
      </table>

    </div>
  </body>
</html>`;

      // Plain text fallback
      textTemplate = `Welcome to the MusoBuddy Beta!

Hi ${firstName},

Thanks for jumping in to help us shape MusoBuddy. Your feedback will directly influence what we build next.

Your 90-day access code: ${customCode}

Sign up at: https://www.musobuddy.com/signup

🔴 FIRST PRIORITY: EMAIL SETUP
Please complete this immediately after signing up:
1. Go to Settings → Email Integration
2. Connect your email account (Gmail, Outlook, or IMAP)
3. Complete the setup wizard

Why this matters: We'll be sending you dummy booking requests to test the system. Without email integration, you won't receive these test bookings and we can't properly evaluate the app's core functionality.

How to give effective feedback:
- Be specific: what you tried, what you expected, what happened
- Add screenshots: capture error messages or odd behaviour
- Include browser console logs
- Tell us your setup: device, OS, browser + version, and steps to reproduce
- Suggestions welcome: features or tweaks that would save you time at gigs

${message ? `Personal Message:\n${message}\n\n` : ''}Need help? Email us at support@musobuddy.com or use the in-app support button.

© ${currentYear} MusoBuddy. All rights reserved.
https://www.musobuddy.com`;
    }

    const result = await mailgunService.sendAuthEmail({
      to: email,
      subject: emailSubject,
      html: htmlTemplate,
      text: textTemplate
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }

    console.log(`✅ [ADMIN] Beta invitation sent to ${email}, message ID: ${result.messageId}`);

    res.json({
      success: true,
      message: 'Beta invitation sent successfully',
      messageId: result.messageId,
      recipient: email
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to send beta invitation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
});

// ===== BETA EMAIL TEMPLATE MANAGEMENT =====

// Get all beta email templates
app.get('/api/admin/beta-email-templates', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('📧 [ADMIN] Fetching all beta email templates');

    const templates = await storage.getAllBetaEmailTemplates();

    res.json({
      success: true,
      templates
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to fetch beta email templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get active beta email template
app.get('/api/admin/beta-email-templates/active', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const template = await storage.getActiveBetaEmailTemplate();

    res.json({
      success: true,
      template
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to fetch active beta email template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create a new beta email template
app.post('/api/admin/beta-email-templates', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, subject, htmlBody, textBody, isActive } = req.body;

    if (!name || !subject || !htmlBody || !textBody) {
      return res.status(400).json({
        error: 'name, subject, htmlBody, and textBody are required'
      });
    }

    console.log(`📧 [ADMIN] Creating beta email template: ${name}`);

    const newTemplate = await storage.createBetaEmailTemplate({
      name,
      description,
      subject,
      htmlBody,
      textBody,
      isActive: isActive || false,
      createdBy: req.user.id
    });

    console.log(`✅ [ADMIN] Beta email template created:`, {
      id: newTemplate.id,
      name: newTemplate.name,
      isActive: newTemplate.isActive
    });

    res.json({
      success: true,
      template: newTemplate
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to create beta email template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update a beta email template
app.put('/api/admin/beta-email-templates/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, description, subject, htmlBody, textBody, isActive } = req.body;

    console.log(`📝 [ADMIN] Updating beta email template ID: ${id}`);

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (subject !== undefined) updates.subject = subject;
    if (htmlBody !== undefined) updates.htmlBody = htmlBody;
    if (textBody !== undefined) updates.textBody = textBody;
    if (isActive !== undefined) updates.isActive = isActive;

    const updatedTemplate = await storage.updateBetaEmailTemplate(parseInt(id), updates);

    if (!updatedTemplate) {
      return res.status(404).json({
        error: 'Beta email template not found'
      });
    }

    console.log(`✅ [ADMIN] Beta email template updated:`, updatedTemplate.name);

    res.json({
      success: true,
      template: updatedTemplate
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to update beta email template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a beta email template
app.delete('/api/admin/beta-email-templates/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check admin permissions
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    console.log(`🗑️ [ADMIN] Deleting beta email template ID: ${id}`);

    const deletedTemplate = await storage.deleteBetaEmailTemplate(parseInt(id));

    if (!deletedTemplate) {
      return res.status(404).json({
        error: 'Beta email template not found'
      });
    }

    console.log(`✅ [ADMIN] Beta email template deleted:`, deletedTemplate.name);

    res.json({
      success: true,
      message: 'Beta email template deleted',
      deletedTemplate
    });

  } catch (error: any) {
    console.error('❌ [ADMIN] Failed to delete beta email template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

}