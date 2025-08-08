// Centralized authentication token management
// SECURITY FIX: User-specific token storage to prevent account switching

export const getAuthTokenKey = (userEmail?: string): string => {
  const hostname = window.location.hostname;
  
  // Create base key based on environment
  const baseKey = hostname.includes('janeway.replit.dev') || hostname.includes('localhost') 
    ? 'authToken_dev' 
    : `authToken_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
  // Add user identifier to prevent token overwrites
  if (userEmail) {
    const userHash = userEmail.replace(/[^a-zA-Z0-9]/g, '_');
    return `${baseKey}_${userHash}`;
  }
  
  return baseKey;
};

export const findActiveAuthToken = (): string | null => {
  const hostname = window.location.hostname;
  const baseKey = hostname.includes('janeway.replit.dev') || hostname.includes('localhost') 
    ? 'authToken_dev' 
    : `authToken_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
  // Find the most recently stored token by checking all matching tokens
  let latestToken = null;
  let latestKey = null;
  
  // Check for user-specific tokens first
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(baseKey + '_')) {
      const token = localStorage.getItem(key);
      if (token) {
        // Use the last found token as browsers typically iterate in insertion order
        latestToken = token;
        latestKey = key;
      }
    }
  }
  
  if (latestToken) {
    console.log(`🔐 Using auth token from key: ${latestKey}`);
    return latestToken;
  }
  
  // Fallback to base token
  const baseToken = localStorage.getItem(baseKey);
  if (baseToken) {
    console.log(`🔐 Using fallback auth token from key: ${baseKey}`);
  }
  return baseToken;
};

export const clearAllAuthTokens = (): void => {
  const hostname = window.location.hostname;
  const baseKey = hostname.includes('janeway.replit.dev') || hostname.includes('localhost') 
    ? 'authToken_dev' 
    : `authToken_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
  // Clear all tokens matching the pattern
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(baseKey) || key.includes('authToken'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

export const storeAuthToken = (token: string, userEmail: string): void => {
  const tokenKey = getAuthTokenKey(userEmail);
  
  // Clear any conflicting tokens first
  clearAllAuthTokens();
  
  // Store the new token
  localStorage.setItem(tokenKey, token);
};

// Alias for compatibility with existing code
export const getAuthToken = findActiveAuthToken;