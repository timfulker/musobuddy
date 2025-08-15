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
    
  
  // ENVIRONMENT-SAFE: Only scan for auth keys in current environment
  const allAuthKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // CRITICAL FIX: Only consider tokens from current environment
    if (key && key.startsWith(baseKey)) {
      const stored = localStorage.getItem(key);
      if (stored) {
        allAuthKeys.push({ key, value: stored });
      }
    }
  }
  
  // Find the most recently stored token by checking all matching tokens
  let latestTokenData = null;
  let latestTimestamp = 0;
  let latestKey = null;
  
  // Check for user-specific tokens first (new format)
  for (const { key, value } of allAuthKeys) {
    if (key.startsWith(baseKey + '_')) {
      try {
        // Try to parse as JSON (new format)
        const tokenData = JSON.parse(value);
        if (tokenData.token && tokenData.timestamp > latestTimestamp) {
          latestTokenData = tokenData;
          latestTimestamp = tokenData.timestamp;
          latestKey = key;
        }
      } catch {
        // Fallback to old format (plain string)
        if (!latestTokenData && typeof value === 'string' && value.length > 20) {
          latestTokenData = { token: value, userEmail: 'unknown' };
          latestKey = key;
        }
      }
    }
  }
  
  if (latestTokenData) {
    return latestTokenData.token;
  }
  
  // MOBILE FALLBACK: Try auth tokens ONLY for current environment
  for (const { key, value } of allAuthKeys) {
    // CRITICAL FIX: Only use tokens from the current environment
    if (!key.startsWith(baseKey)) {
      continue;
    }
    
    try {
      const tokenData = JSON.parse(value);
      if (tokenData.token && typeof tokenData.token === 'string') {
        return tokenData.token;
      }
    } catch {
      // Plain string token - only if from current environment
      if (typeof value === 'string' && value.length > 20) {
        return value;
      }
    }
  }
  
  return null;
};

export const clearAllAuthTokens = (): void => {
  const hostname = window.location.hostname;
  const baseKey = hostname.includes('janeway.replit.dev') || hostname.includes('localhost') 
    ? 'authToken_dev' 
    : `authToken_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
  // Clear only tokens from current environment
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // CRITICAL FIX: Only clear tokens from current environment, not all authToken keys
    if (key && key.startsWith(baseKey)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

export const storeAuthToken = (token: string, userEmail: string): void => {
  const tokenKey = getAuthTokenKey(userEmail);
  
  // SECURITY FIX: Only clear tokens for this specific user, not all users
  const hostname = window.location.hostname;
  const baseKey = hostname.includes('janeway.replit.dev') || hostname.includes('localhost') 
    ? 'authToken_dev' 
    : `authToken_${hostname.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  // Find and remove only this user's tokens
  const userSpecificKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(baseKey)) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const tokenData = JSON.parse(stored);
          if (tokenData.userEmail === userEmail) {
            userSpecificKeys.push(key);
          }
        }
      } catch {
        // Handle old format tokens - only clear generic ones, not user-specific
        if (key === baseKey) {
          userSpecificKeys.push(key);
        }
      }
    }
  }
  
  // Clear only this user's existing tokens
  userSpecificKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Store the new token with timestamp for proper selection
  const tokenData = {
    token,
    userEmail,
    timestamp: Date.now()
  };
  localStorage.setItem(tokenKey, JSON.stringify(tokenData));
  
};

// Alias for compatibility with existing code
export const getAuthToken = findActiveAuthToken;