import { storage } from "./storage";

interface WebhookResult {
  success: boolean;
  message: string;
  bookingId?: number;
  oldStatus?: string;
  newStatus?: string;
  error?: any;
}

interface Contract {
  id: number;
  enquiryId?: number | null;
  status: string;
  [key: string]: any;
}

interface Booking {
  id: number;
  status: string;
  [key: string]: any;
}

export class WebhookService {
  /**
   * Handles contract signing webhook - automatically updates booking status
   * when a contract is signed from 'client_confirms' to 'confirmed'
   */
  static async handleContractSigned(contractId: number, contract: Contract): Promise<WebhookResult> {
    try {
      console.log(`📋 Processing contract signing webhook for contract ${contractId}`);
      
      // Find related booking through enquiry_id
      if (contract.enquiryId) {
        const booking: Booking | null = await storage.getBooking(contract.enquiryId);
        
        if (booking) {
          console.log(`📋 Found related booking ${booking.id} with status: ${booking.status}`);
          
          // Only update if booking is in 'client_confirms' status
          if (booking.status === 'client_confirms') {
            await storage.updateBooking(booking.id, {
              status: 'confirmed'
            }, booking.userId || undefined);
            
            console.log(`✅ WEBHOOK SUCCESS: Contract ${contractId} signed`);
            console.log(`   → Updated booking ${booking.id}: 'client_confirms' → 'confirmed'`);
            
            return {
              success: true,
              message: `Booking ${booking.id} automatically updated to confirmed`,
              bookingId: booking.id,
              oldStatus: 'client_confirms',
              newStatus: 'confirmed'
            };
          } else {
            console.log(`⚠️  Booking ${booking.id} status is '${booking.status}' - no update needed`);
            return {
              success: true,
              message: `Booking status already ${booking.status} - no update needed`
            };
          }
        } else {
          console.log(`⚠️  No booking found for enquiry_id ${contract.enquiryId}`);
          return {
            success: false,
            message: `No booking found for enquiry_id ${contract.enquiryId}`
          };
        }
      } else {
        console.log(`⚠️  Contract ${contractId} has no enquiry_id - cannot find related booking`);
        return {
          success: false,
          message: 'Contract has no enquiry_id - cannot update booking'
        };
      }
    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      return {
        success: false,
        message: `Webhook failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      };
    }
  }

  /**
   * Test webhook functionality with existing data
   */
  static async testWebhook(): Promise<WebhookResult> {
    try {
      console.log('🧪 Testing webhook system...');
      
      // Get a test contract and booking
      const contracts = await storage.getContracts('test-user-id');
      console.log(`Found ${contracts.length} contracts for testing`);
      
      if (contracts.length > 0) {
        const testContract = contracts[0];
        const result = await this.handleContractSigned(testContract.id, testContract);
        console.log('🧪 Webhook test result:', result);
        return result;
      } else {
        return {
          success: false,
          message: 'No contracts available for testing'
        };
      }
    } catch (error) {
      console.error('🧪 Webhook test failed:', error);
      return {
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      };
    }
  }
}

export const webhookService = new WebhookService();