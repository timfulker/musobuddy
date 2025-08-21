// Utility functions for calculating booking totals - SIMPLIFIED SYSTEM
// Travel expenses are always included in the performance fee display

export interface UserSettings {
  // Travel integration setting removed - always include travel in performance fee
}

export interface Booking {
  fee?: number;
  travelExpenses?: number; // Contracts field
  travelExpense?: number;  // Bookings field  
  travel_expense?: number; // Database field name (bookings)
  travel_expenses?: number; // Database field name (contracts)
}

/**
 * Calculate the total amount to display for a booking - SIMPLIFIED
 * Travel expenses are always included in the total display
 */
export function calculateBookingDisplayTotal(
  booking: Booking, 
  userSettings?: UserSettings
): number {
  const fee = booking.fee || 0;
  const travelExpenses = booking.travelExpenses || booking.travelExpense || booking.travel_expense || booking.travel_expenses || 0;
  
  // Always include travel expenses in the total display
  return fee + travelExpenses;
}

/**
 * Get the display text for booking amount - SIMPLIFIED
 * Always show combined total - user decides manually if they want to mention travel breakdown
 */
export function getBookingAmountDisplayText(
  booking: Booking,
  userSettings?: UserSettings
): { main: string; subtitle?: string } {
  const fee = booking.fee || 0;
  const travelExpenses = booking.travelExpenses || booking.travelExpense || booking.travel_expense || booking.travel_expenses || 0;
  
  // Always show combined total - no automatic travel breakdown subtitle
  // Users can manually explain travel breakdown to clients if they choose
  const total = Number(fee) + Number(travelExpenses);
  return {
    main: `£${total.toFixed(2)}`,
    subtitle: undefined // Users control travel breakdown communication manually
  };
}

/**
 * Calculate contract totals - SIMPLIFIED
 * Travel is always included in performance fee, never shown separately
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
  
  // Always include travel in performance fee - no separate display
  return {
    performanceFee: fee + travelExpenses,
    travelExpenses: 0, // Never show separately
    totalAmount: fee + travelExpenses,
    showSeparateTravel: false // Never show travel separately
  };
}