import { db } from "../core/database";
import { userSettings, emailTemplates, globalGigTypes } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class SettingsStorage {
  private db = db;

  // ===== USER SETTINGS METHODS =====
  
  async getSettings(userId: string) {
    const result = await db.select().from(userSettings)
      .where(eq(userSettings.userId, userId));
    return result[0] || null;
  }

  async createSettings(data: {
    userId: string;
    businessName?: string;
    businessPhone?: string;
    businessEmail?: string;
    businessWebsite?: string;
    businessBio?: string;
    logoUrl?: string;
    bankDetails?: any;
    notificationPreferences?: any;
    [key: string]: any; // Allow other fields like customGigTypes, secondaryInstruments, etc.
  }) {
    // Process arrays before saving to database
    const processedData = { ...data };
    
    // Ensure arrays are properly stringified for database storage
    if (processedData.customGigTypes && Array.isArray(processedData.customGigTypes)) {
      processedData.customGigTypes = JSON.stringify(processedData.customGigTypes);
    }
    
    if (processedData.gigTypes && Array.isArray(processedData.gigTypes)) {
      processedData.gigTypes = JSON.stringify(processedData.gigTypes);
    }
    
    if (processedData.secondaryInstruments && Array.isArray(processedData.secondaryInstruments)) {
      processedData.secondaryInstruments = JSON.stringify(processedData.secondaryInstruments);
    }
    
    if (processedData.customClauses && Array.isArray(processedData.customClauses)) {
      processedData.customClauses = JSON.stringify(processedData.customClauses);
    }
    
    // Invoice terms and custom invoice terms are JSONB fields - no need to stringify
    
    const result = await db.insert(userSettings).values({
      ...processedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateSettings(userId: string, updates: any) {
    // PHASE 1 LOGGING: Storage layer received data
    console.log('🔍 PHASE 1 - Storage.updateSettings received data:');
    console.log('  📋 Contract Clauses:', JSON.stringify(updates.contract_clauses, null, 2));
    console.log('  📝 Custom Clauses:', JSON.stringify(updates.custom_clauses, null, 2));
    console.log('  📄 Invoice Clauses:', JSON.stringify(updates.invoice_clauses, null, 2));
    console.log('  📝 Custom Invoice Clauses:', JSON.stringify(updates.custom_invoice_clauses, null, 2));
    
    const existing = await this.getSettings(userId);
    
    if (!existing) {
      console.log('🔍 PHASE 1 - No existing settings, calling createSettings');
      return await this.createSettings({ userId, ...updates });
    }

    // Process arrays before saving to database
    const processedUpdates = { ...updates };
    
    // Ensure arrays are properly stringified for database storage (non-JSONB fields)
    if (processedUpdates.customGigTypes && Array.isArray(processedUpdates.customGigTypes)) {
      processedUpdates.customGigTypes = JSON.stringify(processedUpdates.customGigTypes);
    }
    
    if (processedUpdates.gigTypes && Array.isArray(processedUpdates.gigTypes)) {
      processedUpdates.gigTypes = JSON.stringify(processedUpdates.gigTypes);
    }
    
    if (processedUpdates.secondaryInstruments && Array.isArray(processedUpdates.secondaryInstruments)) {
      processedUpdates.secondaryInstruments = JSON.stringify(processedUpdates.secondaryInstruments);
    }
    
    if (processedUpdates.custom_clauses && Array.isArray(processedUpdates.custom_clauses)) {
      processedUpdates.custom_clauses = JSON.stringify(processedUpdates.custom_clauses);
    }
    
    if (processedUpdates.custom_invoice_clauses && Array.isArray(processedUpdates.custom_invoice_clauses)) {
      processedUpdates.custom_invoice_clauses = JSON.stringify(processedUpdates.custom_invoice_clauses);
    }
    
    // Handle invoice_clauses - ensure it's passed as an object for JSONB field
    // The field comes from frontend as both 'invoiceClauses' and 'invoice_clauses'
    if (processedUpdates.invoiceClauses && !processedUpdates.invoice_clauses) {
      processedUpdates.invoice_clauses = processedUpdates.invoiceClauses;
      delete processedUpdates.invoiceClauses;
    }
    
    // Handle contract_clauses - ensure it's passed as an object for JSONB field  
    if (processedUpdates.contractClauses && !processedUpdates.contract_clauses) {
      processedUpdates.contract_clauses = processedUpdates.contractClauses;
      delete processedUpdates.contractClauses;
    }
    
    // Handle home address field mapping from camelCase frontend to snake_case database
    if (processedUpdates.homeAddressLine1 !== undefined) {
      processedUpdates.home_address_line1 = processedUpdates.homeAddressLine1;
      delete processedUpdates.homeAddressLine1;
    }
    if (processedUpdates.homeAddressLine2 !== undefined) {
      processedUpdates.home_address_line2 = processedUpdates.homeAddressLine2;
      delete processedUpdates.homeAddressLine2;
    }
    if (processedUpdates.homeCity !== undefined) {
      processedUpdates.home_city = processedUpdates.homeCity;
      delete processedUpdates.homeCity;
    }
    if (processedUpdates.homePostcode !== undefined) {
      processedUpdates.home_postcode = processedUpdates.homePostcode;
      delete processedUpdates.homePostcode;
    }
    
    // Contract clauses and invoice clauses are JSONB fields - no need to stringify

    // PHASE 1 LOGGING: Final data being sent to database
    console.log('🔍 PHASE 1 - Final data being sent to database:');
    console.log('  📋 Contract Clauses (contract_clauses):', JSON.stringify(processedUpdates.contract_clauses, null, 2));
    console.log('  📝 Custom Clauses (custom_clauses):', JSON.stringify(processedUpdates.custom_clauses, null, 2));
    console.log('  📄 Invoice Clauses (invoice_clauses):', JSON.stringify(processedUpdates.invoice_clauses, null, 2));
    console.log('  📝 Custom Invoice Clauses (custom_invoice_clauses):', JSON.stringify(processedUpdates.custom_invoice_clauses, null, 2));

    const result = await db.update(userSettings)
      .set({ ...processedUpdates, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    
    // PHASE 1 LOGGING: Database update result
    console.log('🔍 PHASE 1 - Database update result:');
    console.log('  📋 Contract Clauses:', JSON.stringify(result[0]?.contractClauses, null, 2));
    console.log('  📝 Custom Clauses:', JSON.stringify(result[0]?.customClauses, null, 2));
    console.log('  📄 Invoice Clauses:', JSON.stringify(result[0]?.invoiceClauses, null, 2));
    console.log('  📝 Custom Invoice Clauses:', JSON.stringify(result[0]?.customInvoiceClauses, null, 2));
    
    return result[0];
  }

  // ===== EMAIL TEMPLATE METHODS =====
  
  async getEmailTemplates(userId: string) {
    return await db.select().from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(emailTemplates.name);
  }

  async getEmailTemplate(userId: string, type: string) {
    const result = await db.select().from(emailTemplates)
      .where(and(
        eq(emailTemplates.userId, userId),
        eq(emailTemplates.type, type)
      ));
    return result[0] || null;
  }

  async createEmailTemplate(data: {
    userId: string;
    name: string;
    category?: string;
    subject: string;
    emailBody: string;
    smsBody?: string;
    isAutoRespond?: boolean;
  }) {
    const result = await db.insert(emailTemplates).values({
      userId: data.userId,
      name: data.name,
      category: data.category || 'general',
      subject: data.subject,
      emailBody: data.emailBody,
      smsBody: data.smsBody || '',
      isAutoRespond: data.isAutoRespond || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return result[0];
  }

  // Seed default email templates for new users
  async seedDefaultEmailTemplates(userId: string) {
    const defaultTemplates = [
      {
        name: "Enquiry Response - Available",
        subject: "Re: Your Music Enquiry",
        emailBody: `Dear [Client Name],

Thank you for your enquiry regarding musical services for your event.

I am delighted to confirm that I am available for your event on [Date] at [Venue]. 

Based on the details you've provided, I can offer the following:
- Performance duration: [Duration]
- Repertoire: [Style/Genre]
- Equipment provided: [Equipment details]

My fee for this performance would be £[Amount], which includes [What's included].

I would be happy to discuss your specific musical requirements and any special requests you may have. I can also provide a detailed contract outlining all terms and conditions.

Please let me know if you would like to proceed, and I will send over the contract for your review.

Looking forward to being part of your special event.

Best regards,
[Your Name]
[Your Business Name]
[Contact Details]`,
        smsBody: "Thanks for your enquiry! I'm available for your event on [Date]. My fee is £[Amount]. Would you like me to send over a contract? - [Your Name]",
        isDefault: true,
        isAutoRespond: false
      },
      {
        name: "Enquiry Response - Not Available",
        subject: "Re: Your Music Enquiry",
        emailBody: `Dear [Client Name],

Thank you for your enquiry regarding musical services for your event.

Unfortunately, I am not available for your event on [Date] due to a prior commitment.

However, I would be happy to recommend some excellent musicians who may be available for your event. Would you like me to put you in touch with some trusted colleagues?

Alternatively, if you have any flexibility with your date, I may be able to suggest some alternative dates when I would be available.

Thank you for thinking of me for your event, and I apologize that I cannot be of service on this occasion.

Best regards,
[Your Name]
[Your Business Name]
[Contact Details]`,
        smsBody: "Thanks for your enquiry! Unfortunately I'm not available on [Date]. Happy to recommend other musicians or suggest alternative dates if you're flexible. - [Your Name]",
        isDefault: false,
        isAutoRespond: false
      },
      {
        name: "Quote Follow-up",
        subject: "Following up on your music enquiry",
        emailBody: `Dear [Client Name],

I hope this email finds you well.

I wanted to follow up on the quote I sent for your event on [Date] at [Venue]. I understand you may be considering various options for your musical entertainment.

If you have any questions about the quote or would like to discuss any aspect of the performance, please don't hesitate to get in touch. I'm happy to adjust the repertoire or discuss any specific requirements you may have.

To secure your date, I would need to receive a signed contract and deposit. I'm confident that I can provide exactly the musical atmosphere you're looking for.

I look forward to hearing from you soon.

Best regards,
[Your Name]
[Your Business Name]
[Contact Details]`,
        smsBody: "Hi [Client Name], following up on the quote for your event on [Date]. Any questions or ready to book? Let me know! - [Your Name]",
        isDefault: false,
        isAutoRespond: false
      },
      {
        name: "Contract Reminder",
        subject: "Contract awaiting signature",
        emailBody: `Dear [Client Name],

I hope you're well and that your event planning is going smoothly.

I wanted to remind you that I sent over the contract for your event on [Date] at [Venue], but I haven't yet received the signed copy back.

To secure your booking, I need to receive the signed contract and deposit payment. This ensures that your date is reserved and that we have all the details confirmed for your special day.

If you have any questions about the contract terms or need any clarification, please don't hesitate to contact me.

The contract can be signed digitally via the link I sent, or you can print, sign, and return it by email.

Thank you for your attention to this matter.

Best regards,
[Your Name]
[Your Business Name]
[Contact Details]`,
        smsBody: "Hi [Client Name], just a reminder that your contract for [Date] is awaiting signature. Link: [Contract Link]. Any questions? - [Your Name]",
        isDefault: false,
        isAutoRespond: false
      },
      {
        name: "Invoice Reminder",
        subject: "Invoice payment reminder",
        emailBody: `Dear [Client Name],

I hope your event was everything you hoped for and that you enjoyed the musical entertainment.

I wanted to remind you that invoice [Invoice Number] for £[Amount] was due on [Due Date] and I have not yet received payment.

I understand that sometimes invoices can be overlooked in the busy period following an event, so I wanted to send a gentle reminder.

Payment can be made via bank transfer to:
[Payment Details]

If you have any questions about the invoice or if there are any issues with payment, please don't hesitate to contact me.

Thank you for your prompt attention to this matter.

Best regards,
[Your Name]
[Your Business Name]
[Contact Details]`,
        smsBody: "Hi [Client Name], friendly reminder that invoice [Invoice Number] for £[Amount] was due on [Due Date]. Payment details: [Payment Info]. Thanks! - [Your Name]",
        isDefault: false,
        isAutoRespond: false
      }
    ];

    // Insert all default templates for this user
    for (const template of defaultTemplates) {
      await db.insert(emailTemplates).values({
        userId,
        name: template.name,
        subject: template.subject,
        emailBody: template.emailBody,
        smsBody: template.smsBody,
        isDefault: template.isDefault,
        isAutoRespond: template.isAutoRespond,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`✅ Seeded ${defaultTemplates.length} default email templates for user ${userId}`);
  }

  async updateEmailTemplate(id: number, userId: string, updates: any) {
    const result = await db.update(emailTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId)
      ))
      .returning();
    
    return result[0];
  }

  async deleteEmailTemplate(id: number, userId: string) {
    const result = await db.delete(emailTemplates)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }

  async setDefaultEmailTemplate(id: number, userId: string) {
    try {
      // First, remove default status from all user's templates
      await db.update(emailTemplates)
        .set({ isDefault: false })
        .where(eq(emailTemplates.userId, userId));

      // Then set the specified template as default
      const result = await db.update(emailTemplates)
        .set({ isDefault: true })
        .where(and(
          eq(emailTemplates.id, id),
          eq(emailTemplates.userId, userId)
        ))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error('❌ Error setting default template:', error);
      return false;
    }
  }

  // Removed redundant global gig types methods - now using only customGigTypes in userSettings
}

export const settingsStorage = new SettingsStorage();