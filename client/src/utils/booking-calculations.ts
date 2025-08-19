// Utility functions for calculating booking totals based on user settings

export interface UserSettings {
  includeTravelInPerformanceFee?: boolean;
}

export interface Booking {
  fee?: number;
  travelExpenses?: number;
}

/**
 * Calculate the total amount to display for a booking based on user settings
 */
export function calculateBookingDisplayTotal(
  booking: Booking, 
  userSettings?: UserSettings
): number {
  const fee = booking.fee || 0;
  const travelExpenses = booking.travelExpenses || 0;
  
  // If setting is true or undefined (default), include travel expenses in performance fee display
  const includeTravelInPerformanceFee = userSettings?.includeTravelInPerformanceFee !== false;
  
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
  const travelExpenses = booking.travelExpenses || 0;
  const includeTravelInPerformanceFee = userSettings?.includeTravelInPerformanceFee !== false;
  
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
  const travelExpenses = booking.travelExpenses || 0;
  const includeTravelInPerformanceFee = userSettings?.includeTravelInPerformanceFee !== false;
  
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