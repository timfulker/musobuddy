/**
 * Development helpers for handling database failures gracefully
 */

export async function safeDbCall<T>(
  dbOperation: () => Promise<T>, 
  fallbackData: T, 
  operationName: string = 'Database operation'
): Promise<T> {
  try {
    return await dbOperation();
  } catch (error: any) {
    // Check if this is a database connectivity error in development
    if (process.env.NODE_ENV === 'development' && (
      error.message?.includes('getaddrinfo ENOTFOUND') ||
      error.message?.includes('connect ECONNREFUSED') ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED'
    )) {
      console.log(`🚧 [DEV-FALLBACK] ${operationName} failed, using fallback data:`, error.message);
      return fallbackData;
    }
    
    // Re-throw non-database errors or production errors
    throw error;
  }
}

// Common fallback data patterns
export const developmentFallbacks = {
  bookings: [],
  contracts: [],
  invoices: [],
  clients: [],
  conflicts: [],
  compliance: [],
  blockedDates: [],
  messages: [],
  settings: {
    travelExpenseSettings: null,
    smsNotifications: false,
    emailSignature: '',
    autoResponderEnabled: false,
    defaultContractTerms: '',
    themeColor: '#191970',
    themeName: 'midnight-blue',
    themeShowTerms: true
  },
  notificationCounts: {
    newBookings: 0,
    unparseableMessages: 0,
    overdueInvoices: 0,
    expiredDocuments: 0
  },
  conflictResolutions: []
};