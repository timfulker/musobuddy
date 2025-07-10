// Fix for storage.ts - Replace the createInvoice method (around lines 264-320) with this improved version

async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
  console.log('🔥 Storage.createInvoice called with:', JSON.stringify(invoice, null, 2));
  
  try {
    // Get user settings to determine next invoice number
    console.log('🔥 Getting user settings for user:', invoice.userId);
    const settings = await this.getUserSettings(invoice.userId);
    console.log('🔥 User settings:', JSON.stringify(settings, null, 2));
    
    let nextNumber = settings?.nextInvoiceNumber || 256;
    console.log('🔥 Starting with next invoice number:', nextNumber);
    
    // Find the next available invoice number by checking existing invoices
    let attempts = 0;
    const maxAttempts = 10;
    let finalInvoiceNumber: string | null = null;
    
    while (attempts < maxAttempts) {
      const candidateNumber = nextNumber.toString().padStart(5, '0');
      console.log(`🔥 Attempt ${attempts + 1}: Checking invoice number ${candidateNumber}`);
      
      // Check if this invoice number already exists
      const existingInvoice = await this.getInvoiceByNumber(invoice.userId, candidateNumber);
      
      if (!existingInvoice) {
        console.log(`✅ Invoice number ${candidateNumber} is available`);
        finalInvoiceNumber = candidateNumber;
        break;
      } else {
        console.log(`❌ Invoice number ${candidateNumber} already exists`);
        nextNumber++;
        attempts++;
      }
    }
    
    if (!finalInvoiceNumber) {
      console.error('❌ Unable to generate unique invoice number after', maxAttempts, 'attempts');
      throw new Error('Unable to generate unique invoice number after multiple attempts');
    }
    
    // Prepare the final invoice data
    const finalInvoiceData = {
      ...invoice,
      invoiceNumber: finalInvoiceNumber,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('🔥 Final invoice data for insertion:', JSON.stringify(finalInvoiceData, null, 2));
    
    // Create the invoice
    console.log('🔥 Inserting invoice into database...');
    const [newInvoice] = await db
      .insert(invoices)
      .values(finalInvoiceData)
      .returning();
    
    console.log('✅ Invoice inserted successfully:', JSON.stringify(newInvoice, null, 2));
    
    // Update the next invoice number in user settings
    console.log('🔥 Updating user settings with next invoice number:', nextNumber + 1);
    await this.updateUserSettings(invoice.userId, {
      nextInvoiceNumber: nextNumber + 1
    });
    
    console.log('✅ User settings updated successfully');
    console.log('🎉 Invoice creation completed successfully!');
    
    return newInvoice;
    
  } catch (error: any) {
    console.error('❌❌❌ STORAGE CREATEINVOICE ERROR ❌❌❌');
    console.error('Error type:', typeof error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error constraint:', error.constraint);
    console.error('Error detail:', error.detail);
    console.error('Error stack:', error.stack);
    console.error('Invoice data that failed:', JSON.stringify(invoice, null, 2));
    
    // Handle specific database errors
    if (error.code === '23505') {
      // Unique constraint violation - this might be a race condition
      console.error('❌ Unique constraint violation - likely race condition');
      throw new Error('Invoice number conflict - please try again');
    }
    
    if (error.code === '23503') {
      // Foreign key constraint violation
      console.error('❌ Foreign key constraint violation');
      throw new Error('Invalid reference to user or contract');
    }
    
    if (error.code === '23502') {
      // Not null constraint violation
      console.error('❌ Not null constraint violation');
      throw new Error('Missing required field');
    }
    
    // Re-throw the original error if we don't handle it specifically
    throw error;
  }
}