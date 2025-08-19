// Utility functions for calculating booking totals based on user settings

export interface UserSettings {
  includeTravelInPerformanceFee?: boolean;
}

export interface Booking {
  fee?: number;
  travelExpenses?: number; // Contracts field
  travelExpense?: number;  // Bookings field  
  travel_expense?: number; // Database field name (bookings)
  travel_expenses?: number; // Database field name (contracts)
}

/**
 * Calculate the total amount to display for a booking based on user settings
 */
export function calculateBookingDisplayTotal(
  booking: Booking, 
  userSettings?: UserSettings
): number {
  const fee = booking.fee || 0;
  const travelExpenses = booking.travelExpenses || booking.travelExpense || booking.travel_expense || booking.travel_expenses || 0;
  
  // Only include travel expenses in performance fee display if explicitly set to true
  const includeTravelInPerformanceFee = userSettings?.includeTravelInPerformanceFee === true;
  
  if (includeTravelInPerformanceFee) {
    return fee + travelExpenses;
  } else {
    return fee; // Show only performance fee, travel listed separately
  }
}

/**
 * Get the display text for booking amount based on user settings
 */
export function getBookingAmountDisplayText(
  booking: Booking,
  userSettings?: UserSettings
): { main: string; subtitle?: string } {
  const fee = booking.fee || 0;
  const travelExpenses = booking.travelExpenses || booking.travelExpense || booking.travel_expense || booking.travel_expenses || 0;
  const includeTravelInPerformanceFee = userSettings?.includeTravelInPerformanceFee === true;
  
  if (includeTravelInPerformanceFee) {
    // Show combined total
    const total = Number(fee) + Number(travelExpenses);
    return {
      main: `£${total.toFixed(2)}`,
      subtitle: travelExpenses > 0 ? `(inc. £${Number(travelExpenses).toFixed(2)} travel)` : undefined
    };
  } else {
    // Show performance fee with separate travel line
    return {
      main: `£${Number(fee).toFixed(2)}`,
      subtitle: travelExpenses > 0 ? `+ £${Number(travelExpenses).toFixed(2)} travel` : undefined
    };
  }
}

/**
 * Calculate contract totals based on user settings
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
  const includeTravelInPerformanceFee = userSettings?.includeTravelInPerformanceFee === true;
  
  if (includeTravelInPerformanceFee) {
    // Include travel in performance fee
    return {
      performanceFee: fee + travelExpenses,
      travelExpenses: 0, // Don't show separately
      totalAmount: fee + travelExpenses,
      showSeparateTravel: false
    };
  } else {
    // Keep travel expenses separate
    return {
      performanceFee: fee,
      travelExpenses: travelExpenses,
      totalAmount: fee + travelExpenses,
      showSeparateTravel: travelExpenses > 0
    };
  }
}