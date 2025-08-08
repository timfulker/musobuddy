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
    
  console.log(`🔐 findActiveAuthToken - hostname: ${hostname}`);
  console.log(`🔐 findActiveAuthToken - baseKey: ${baseKey}`);
  
  // Debug: show all localStorage keys
  console.log('🔐 All localStorage keys:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('authToken')) {
      console.log(`  - ${key}: ${!!localStorage.getItem(key)}`);
    }
  }
    
  // Find the most recently stored token by checking all matching tokens
  let latestTokenData = null;
  let latestTimestamp = 0;
  let latestKey = null;
  
  // Check for user-specific tokens first
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(baseKey + '_')) {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          // Try to parse as JSON (new format)
          const tokenData = JSON.parse(stored);
          if (tokenData.token && tokenData.timestamp > latestTimestamp) {
            latestTokenData = tokenData;
            latestTimestamp = tokenData.timestamp;
            latestKey = key;
          }
        } catch {
          // Fallback to old format (plain string)
          if (!latestTokenData) {
            latestTokenData = { token: stored, userEmail: 'unknown' };
            latestKey = key;
          }
        }
      }
    }
  }
  
  if (latestTokenData) {
    console.log(`🔐 Using auth token for user: ${latestTokenData.userEmail} from key: ${latestKey}`);
    return latestTokenData.token;
  }
  
  // Fallback to base token (old format)
  const baseToken = localStorage.getItem(baseKey);
  if (baseToken) {
    console.log(`🔐 Using fallback auth token from key: ${baseKey}`);
    return baseToken;
  }
  
  return null;
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
  
  // Clear any conflicting tokens first to prevent cross-contamination
  clearAllAuthTokens();
  
  // Store the new token with timestamp for proper selection
  const tokenData = {
    token,
    userEmail,
    timestamp: Date.now()
  };
  localStorage.setItem(tokenKey, JSON.stringify(tokenData));
  
  console.log(`🔐 Stored auth token for user: ${userEmail}`);
};

// Alias for compatibility with existing code
export const getAuthToken = findActiveAuthToken;