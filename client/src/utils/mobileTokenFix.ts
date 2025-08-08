// Mobile Safari token detection emergency fix
export function findMobileToken(): string | null {
  console.log('🔧 MOBILE TOKEN FIX - Scanning localStorage');
  
  // Scan all localStorage keys for any auth token
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('auth')) {
      const stored = localStorage.getItem(key);
      console.log(`🔧 Found auth key: ${key}, hasValue: ${!!stored}`);
      
      if (stored) {
        try {
          // Try parsing as JSON
          const parsed = JSON.parse(stored);
          if (parsed.token && typeof parsed.token === 'string') {
            console.log(`🔧 SUCCESS: Using token from ${key}`);
            return parsed.token;
          }
        } catch {
          // Plain string token
          if (typeof stored === 'string' && stored.length > 20) {
            console.log(`🔧 SUCCESS: Using plain token from ${key}`);
            return stored;
          }
        }
      }
    }
  }
  
  console.log('🔧 NO TOKEN FOUND in localStorage');
  return null;
}