import { db } from '../core/database';
import { contracts, bookings } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export class ContractSigningEmailService {
  
  /**
   * Send contract signing confirmation email with collaborative form access
   */
  async sendSigningConfirmation(
    contract: any, 
    userSettings: any, 
    services: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate collaborative form access (more secure than old system)
      const portalAccess = await this.setupCollaborativeForm(contract.id);

      // Get theme color from settings
      const themeColor = userSettings?.themeAccentColor || userSettings?.theme_accent_color || '#1e3a8a';
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Contract Signed - Client Portal Access</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${themeColor};">✅ Contract Successfully Signed!</h2>
            
            <p>Dear ${contract.clientName},</p>
            
            <p>Thank you for signing your contract! Your booking for ${new Date(contract.eventDate).toLocaleDateString('en-GB')} is now confirmed.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Event Details:</h3>
              <p><strong>Date:</strong> ${new Date(contract.eventDate).toLocaleDateString('en-GB')}</p>
              <p><strong>Time:</strong> ${contract.eventTime || 'TBC'} ${contract.eventEndTime ? '- ' + contract.eventEndTime : ''}</p>
              ${contract.performanceDuration ? `<p><strong>Performance Time:</strong> ${contract.performanceDuration}</p>` : ''}
              <p><strong>Venue:</strong> ${contract.venue}</p>
              <p><strong>Fee:</strong> £${contract.fee}</p>
              ${contract.deposit && parseFloat(contract.deposit) > 0 ? `<p><strong>Deposit:</strong> £${contract.deposit}</p>` : ''}
            </div>
            
            <h3 style="color: ${themeColor};">🎵 Your Client Portal</h3>
            <p>We've created a secure client portal where you can collaborate on event details, add requirements, and stay updated:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${portalAccess.portalUrl}" 
                 style="background: ${themeColor}; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Access Your Client Portal
              </a>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <p style="margin-bottom: 10px; font-weight: bold;">Or scan this QR code:</p>
              <img src="${portalAccess.qrCode}" alt="Client Portal QR Code" style="max-width: 150px; border: 1px solid #ddd; padding: 10px; border-radius: 5px;">
            </div>
            
            <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; border-left: 4px solid ${themeColor};">
              <p style="margin: 0;"><strong>What you can do in your portal:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Add special requests or requirements</li>
                <li>Update event details collaboratively</li>
                <li>Communicate directly about your event</li>
                <li>Access all your event information in one place</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contract.cloudStorageUrl}" 
                 style="background: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; margin-right: 15px;">
                📄 View Signed Contract
              </a>
            </div>
            
            <p>We're excited to perform at your event and look forward to working with you to make it perfect!</p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="font-size: 14px; color: #666;">
              Best regards,<br>
              ${userSettings?.businessName || 'MusoBuddy Team'}<br>
              ${userSettings?.businessEmail || ''}
            </p>
          </div>
        </body>
        </html>
      `;

      const emailData = {
        to: contract.clientEmail,
        subject: `🎵 Contract Signed - Your Client Portal Access`,
        html: emailHtml
      };

      // Send email using existing email service
      const emailResult = await services.sendEmail(emailData);
      
      if (emailResult.success) {
        console.log(`✅ Contract signing confirmation sent to ${contract.clientEmail} with client portal access`);
        return { success: true };
      } else {
        console.error('❌ Failed to send signing confirmation email:', emailResult.error);
        return { success: false, error: emailResult.error };
      }
      
    } catch (error: any) {
      console.error('❌ Error sending contract signing confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate collaborative form for signed contract
   * This is the more secure system with field locking and proper camelCase conversion
   */
  private async setupCollaborativeForm(contractId: number): Promise<{
    portalUrl: string;
    portalToken: string;
    qrCode: string;
  }> {
    // Get contract with associated booking
    const contract = await db.select().from(contracts)
      .where(eq(contracts.id, contractId))
      .then(results => results[0]);

    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    // Get or create associated booking for collaboration
    let booking = await db.select().from(bookings)
      .where(eq(bookings.contractId, contractId))
      .then(results => results[0]);

    if (!booking) {
      // Create minimal booking record for collaboration if none exists
      console.log(`📝 [COLLABORATIVE-FORM] Creating booking for contract ${contractId}`);
      const [newBooking] = await db.insert(bookings).values({
        userId: contract.userId,
        clientName: contract.clientName,
        clientEmail: contract.clientEmail || '',
        venue: contract.venue,
        eventDate: contract.eventDate,
        eventType: contract.eventType || 'Performance',
        status: 'draft',
        contractId: contract.id
      }).returning();
      
      booking = newBooking;
      console.log(`✅ [COLLABORATIVE-FORM] Created booking ${booking.id} for contract ${contractId}`);
    }

    // Generate secure portal token
    const portalToken = crypto.randomBytes(32).toString('hex');
    
    // Build the dynamic collaborative form URL
    const baseUrl = process.env.REPLIT_DEPLOYMENT 
      ? 'https://www.musobuddy.com'
      : `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.dev`;
      
    const dynamicFormUrl = `${baseUrl}/api/collaborative-form/${portalToken}`;

    // Update contract with collaborative form details
    await db.update(contracts)
      .set({
        clientPortalUrl: dynamicFormUrl,
        clientPortalToken: portalToken,
        updatedAt: new Date()
      })
      .where(eq(contracts.id, contractId));

    // Generate QR code for the collaboration URL
    const QRCode = await import('qrcode');
    const qrCodeDataUrl = await (QRCode.default || QRCode).toDataURL(dynamicFormUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    console.log(`✅ [COLLABORATIVE-FORM] Generated secure form URL for contract ${contractId}: ${dynamicFormUrl}`);
    
    return {
      portalToken,
      portalUrl: dynamicFormUrl,
      qrCode: qrCodeDataUrl
    };
  }
}

export const contractSigningEmailService = new ContractSigningEmailService();