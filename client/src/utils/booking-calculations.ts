// Utility functions for calculating booking totals - CLEAR SEPARATION
// Performance fee and travel expenses are now kept separate for clarity

export interface UserSettings {
  // Travel integration setting removed - fees always shown separately
}

export interface Booking {
  fee?: number;           // Performance fee only (no travel)
  travelExpenses?: number; // Contracts field
  travelExpense?: number;  // Bookings field  
  travel_expense?: number; // Database field name (bookings)
  travel_expenses?: number; // Database field name (contracts)
}

/**
 * Get the total amount to display for a booking - NO CALCULATIONS
 * Just returns the stored finalAmount or individual values as-is
 */
export function calculateBookingDisplayTotal(
  booking: Booking, 
  userSettings?: UserSettings
): number {
  // If we have finalAmount (from client extraction), use that as the total
  if (booking.finalAmount && booking.finalAmount > 0) {
    return booking.finalAmount;
  }
  
  // Otherwise just return fee or travel expenses as individual values
  const fee = booking.fee || 0;
  const travelExpenses = booking.travelExpenses || booking.travelExpense || booking.travel_expense || booking.travel_expenses || 0;
  
  // Return whichever value is available - NO ADDITION
  if (travelExpenses > 0) {
    return travelExpenses;
  }
  
  return fee;
}

/**
 * Get the display text for booking amount - NO CALCULATIONS
 * Just shows the values as they are stored
 */
export function getBookingAmountDisplayText(
  booking: Booking,
  userSettings?: UserSettings,
  showBreakdown: boolean = false
): { main: string; subtitle?: string } {
  // NO CALCULATIONS - just display what's stored
  const finalAmount = booking.finalAmount;
  const travelExpenses = booking.travelExpenses || booking.travelExpense || booking.travel_expense || booking.travel_expenses || 0;
  
  // If we have finalAmount, show that as the main total
  if (finalAmount && finalAmount > 0) {
    return {
      main: `£${finalAmount.toFixed(2)}`,
      subtitle: showBreakdown && travelExpenses > 0 
        ? `(Travel: £${travelExpenses.toFixed(2)})`
        : undefined
    };
  }
  
  // Otherwise just show travel expenses if available
  if (travelExpenses > 0) {
    return {
      main: `£${travelExpenses.toFixed(2)}`,
      subtitle: showBreakdown ? '(Travel expenses only)' : undefined
    };
  }
  
  // Fall back to fee if no other amount
  const fee = booking.fee || 0;
  return {
    main: `£${fee.toFixed(2)}`,
    subtitle: undefined
  };
}

/**
 * Calculate contract totals - CLEAR SEPARATION
 * Returns separate fees and total for contracts
 */
export function calculateContractTotals(
  booking: Booking,
  userSettings?: UserSettings
): {
  performanceFee: number;
  travelExpenses: number;
  totalAmount: number;
  showSeparateTravel: boolean;
} {
  const fee = booking.fee || 0;
  const travelExpenses = booking.travelExpenses || booking.travelExpense || booking.travel_expense || booking.travel_expenses || 0;
  
  // Keep fees separate for internal tracking, show total to client
  return {
    performanceFee: fee,           // Base performance fee only
    travelExpenses: travelExpenses, // Travel expenses separately
    totalAmount: fee + travelExpenses, // Total for client display
    showSeparateTravel: true       // Internal tracking shows separation
  };
}