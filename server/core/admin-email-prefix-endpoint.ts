/**
 * Admin Email Prefix Management Endpoint
 * 
 * Add this endpoint to server/core/routes.ts for UI-based email prefix management
 * This is a reference implementation - integrate into routes.ts when needed
 */

// Admin-only endpoint to change user email prefix
// Add to server/core/routes.ts:

/*
app.patch('/api/admin/users/:userId/email-prefix', async (req: any, res) => {
  try {
    // Check admin authentication
    const currentUser = await storage.getUserById(req.session?.userId);
    if (!currentUser?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { newPrefix } = req.body;

    if (!newPrefix || typeof newPrefix !== 'string') {
      return res.status(400).json({ error: 'New prefix is required' });
    }

    // Validate new prefix format
    const { MailgunService } = await import('./mailgun-routes');
    const mailgunService = new MailgunService();
    const validation = await mailgunService.validateEmailPrefix(newPrefix);
    
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Check if prefix is already taken by another user
    const existingUser = await storage.getUserByEmailPrefix(newPrefix);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({ 
        error: `Email prefix "${newPrefix}" is already in use by user: ${existingUser.email}` 
      });
    }

    // Get current user to log change
    const targetUser = await storage.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldPrefix = targetUser.emailPrefix;

    // Update user email prefix
    const updatedUser = await storage.updateUser(userId, { 
      emailPrefix: newPrefix.toLowerCase() 
    });

    // Log the change for audit trail
    console.log('📧 ADMIN: Email prefix changed:', {
      adminUserId: currentUser.id,
      adminEmail: currentUser.email,
      targetUserId: userId,
      targetEmail: targetUser.email,
      oldPrefix: oldPrefix,
      newPrefix: newPrefix.toLowerCase(),
      timestamp: new Date().toISOString()
    });

    // Optional: Update Mailgun route automatically
    // This would require additional Mailgun API integration
    // await mailgunService.updateUserEmailRoute(userId, newPrefix);

    res.json({ 
      success: true, 
      user: updatedUser,
      oldEmailAddress: oldPrefix ? `leads+${oldPrefix}@mg.musobuddy.com` : 'none',
      newEmailAddress: `leads+${newPrefix}@mg.musobuddy.com`,
      message: 'Email prefix updated successfully. Please inform the user of their new email address.'
    });

  } catch (error: any) {
    console.error('❌ Email prefix change error:', error);
    res.status(500).json({ error: error.message });
  }
});
*/

/**
 * Usage Example:
 * 
 * POST /api/admin/users/3n3D4TZ2V7-MUCseHaw8c/email-prefix
 * {
 *   "newPrefix": "timfulker"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "user": { ... },
 *   "oldEmailAddress": "leads+saxweddings@mg.musobuddy.com",
 *   "newEmailAddress": "leads+timfulker@mg.musobuddy.com",
 *   "message": "Email prefix updated successfully. Please inform the user of their new email address."
 * }
 */

export {};