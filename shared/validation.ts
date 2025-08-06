// Type-safe data validation utilities

export const validateBooking = (data: unknown): data is any => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'clientName' in data &&
    'eventDate' in data
  );
};

export const validateBookingArray = (data: unknown): data is any[] => {
  return Array.isArray(data) && data.every(validateBooking);
};

export const validateContract = (data: unknown): data is any => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'clientName' in data
  );
};

export const validateInvoice = (data: unknown): data is any => {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'amount' in data
  );
};

// Safe property access utilities
export const safeGet = <T, K extends keyof T>(
  obj: T | null | undefined, 
  key: K
): T[K] | undefined => {
  return obj?.[key];
};

export const safeGetString = (obj: any, key: string, defaultValue: string = ''): string => {
  return obj?.[key] || defaultValue;
};

export const safeGetNumber = (obj: any, key: string, defaultValue: number = 0): number => {
  const value = obj?.[key];
  return typeof value === 'number' ? value : defaultValue;
};

export const safeGetArray = <T>(obj: any, key: string): T[] => {
  const value = obj?.[key];
  return Array.isArray(value) ? value : [];
};