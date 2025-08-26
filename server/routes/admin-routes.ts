/**
 * Admin routes for bulk re-processing and system maintenance
 */

import { type Express } from 'express';
import { storage } from '../core/storage';

// Export the registration function for the routes/index.ts file
export async function registerAdminRoutes(app: Express) {
  
// Manual re-process selected bookings endpoint  
app.post('/api/admin/reprocess-bookings', async (req, res) => {
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
app.get('/api/admin/problematic-bookings', async (req, res) => {
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
app.post('/api/admin/link-firebase-user', async (req, res) => {
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

// Create new user endpoint for admin panel
app.post('/api/admin/users', async (req, res) => {
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
      phoneVerified 
    } = req.body;
    
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ 
        error: 'Email, first name, last name, and password are required' 
      });
    }
    
    console.log(`🔧 [ADMIN] Creating new user: ${email}`);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: `User with email ${email} already exists` 
      });
    }
    
    // If firebaseUid provided, check if it's already linked
    if (firebaseUid) {
      const existingFirebaseUser = await storage.getUserByFirebaseUid(firebaseUid);
      if (existingFirebaseUser) {
        return res.status(409).json({ 
          error: `Firebase UID ${firebaseUid} is already linked to another user: ${existingFirebaseUser.email}` 
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
      firebaseUid: firebaseUid || null,
      tier: tier || 'free',
      isAdmin: isAdmin || false,
      isBetaTester: isBetaTester || false,
      phoneVerified: phoneVerified || false,
      isActive: true,
      onboardingCompleted: false
    };
    
    // Create user in database
    const newUser = await storage.createUser(userData);
    
    console.log(`✅ [ADMIN] Successfully created user ${email} (ID: ${userId})`);
    if (firebaseUid) {
      console.log(`🔗 [ADMIN] Firebase UID ${firebaseUid} linked during creation`);
    }
    
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
        firebaseUid: newUser.firebaseUid
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
app.get('/api/admin/users', async (req, res) => {
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
app.get('/api/admin/overview', async (req, res) => {
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

}