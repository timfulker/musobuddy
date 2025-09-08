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
 * Calculate the total amount to display for a booking - CLEAR SEPARATION
 * Returns sum of performance fee and travel expenses
 */
export function calculateBookingDisplayTotal(
  booking: Booking, 
  userSettings?: UserSettings
): number {
  const fee = booking.fee || 0;
  const travelExpenses = booking.travelExpenses || booking.travelExpense || booking.travel_expense || booking.travel_expenses || 0;
  
  // Return the sum of performance fee and travel expenses
  return fee + travelExpenses;
}

/**
 * Get the display text for booking amount - CLEAR SEPARATION
 * Shows total with optional breakdown
 */
export function getBookingAmountDisplayText(
  booking: Booking,
  userSettings?: UserSettings,
  showBreakdown: boolean = false
): { main: string; subtitle?: string } {
  const fee = booking.fee || 0;
  const travelExpenses = booking.travelExpenses || booking.travelExpense || booking.travel_expense || booking.travel_expenses || 0;
  
  // Calculate total
  const total = Number(fee) + Number(travelExpenses);
  
  // Option to show breakdown if needed
  return {
    main: `£${total.toFixed(2)}`,
    subtitle: showBreakdown && travelExpenses > 0 
      ? `(Performance: £${fee.toFixed(2)} + Travel: £${travelExpenses.toFixed(2)})`
      : undefined
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