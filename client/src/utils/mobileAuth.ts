// Mobile authentication fix - forces cache refresh and proper token detection
export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Force mobile browsers to bypass cache for authentication
export const forceMobileAuthRefresh = (): void => {
  if (isMobileDevice()) {
    // Add timestamp to force cache refresh
    const timestamp = Date.now();
    localStorage.setItem('mobile_auth_refresh', timestamp.toString());
    console.log('📱 Mobile auth refresh forced:', timestamp);
  }
};

// Enhanced mobile token detection with aggressive fallbacks
export const findMobileAuthToken = (): string | null => {
  console.log('📱 MOBILE AUTH: Starting comprehensive token scan');
  
  // Scan ALL localStorage keys for any authentication data
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }
  
  console.log('📱 All localStorage keys:', allKeys);
  
  // Look for any token-like data
  for (const key of allKeys) {
    if (key.includes('auth') || key.includes('token')) {
      const stored = localStorage.getItem(key);
      console.log(`📱 Checking key: ${key}, hasValue: ${!!stored}`);
      
      if (stored) {
        try {
          // Try parsing as JSON
          const parsed = JSON.parse(stored);
          if (parsed.token && typeof parsed.token === 'string' && parsed.token.length > 10) {
            console.log(`📱 SUCCESS: Found JSON token in key: ${key}`);
            return parsed.token;
          }
        } catch {
          // Try as plain string
          if (typeof stored === 'string' && stored.length > 20) {
            console.log(`📱 SUCCESS: Found plain token in key: ${key}`);
            return stored;
          }
        }
      }
    }
  }
  
  console.log('📱 NO TOKEN FOUND in any localStorage key');
  return null;
};

// Mobile-specific API call with enhanced error handling
export const callMobileAPI = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const token = findMobileAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found on mobile device');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...options.headers
  };
  
  console.log(`📱 Mobile API call to ${endpoint} with token`);
  
  return fetch(endpoint, {
    ...options,
    headers
  });
};