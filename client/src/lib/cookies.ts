/**
 * Cookie utility functions for managing cookies in the browser
 */

export type CookieOptions = {
  expires?: number | Date; // Days or Date object
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
};

export type CookieConsent = {
  necessary: boolean; // Always true
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
};

const CONSENT_COOKIE_NAME = 'musobuddy_cookie_consent';
const CONSENT_DURATION_DAYS = 365; // 1 year

/**
 * Set a cookie
 */
export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (options.expires) {
    let expiresDate: Date;
    if (typeof options.expires === 'number') {
      expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + options.expires);
    } else {
      expiresDate = options.expires;
    }
    cookieString += `; expires=${expiresDate.toUTCString()}`;
  }

  if (options.path) {
    cookieString += `; path=${options.path}`;
  } else {
    cookieString += '; path=/'; // Default to root path
  }

  if (options.domain) {
    cookieString += `; domain=${options.domain}`;
  }

  if (options.secure) {
    cookieString += '; secure';
  }

  if (options.sameSite) {
    cookieString += `; samesite=${options.sameSite}`;
  }

  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  const nameEQ = encodeURIComponent(name) + '=';
  const cookies = document.cookie.split(';');
  
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  
  return null;
}

/**
 * Delete a cookie
 */
export function deleteCookie(name: string, path: string = '/'): void {
  setCookie(name, '', {
    expires: new Date(0),
    path
  });
}

/**
 * Check if cookies are enabled
 */
export function areCookiesEnabled(): boolean {
  try {
    const testKey = '__cookie_test__';
    setCookie(testKey, 'test', { expires: 1 });
    const cookieEnabled = getCookie(testKey) === 'test';
    deleteCookie(testKey);
    return cookieEnabled;
  } catch {
    return false;
  }
}

/**
 * Get all cookies as an object
 */
export function getAllCookies(): Record<string, string> {
  const cookies: Record<string, string> = {};
  const cookieArray = document.cookie.split(';');
  
  for (let cookie of cookieArray) {
    cookie = cookie.trim();
    if (cookie) {
      const [name, value] = cookie.split('=');
      if (name && value) {
        cookies[decodeURIComponent(name)] = decodeURIComponent(value);
      }
    }
  }
  
  return cookies;
}

/**
 * Save cookie consent preferences
 */
export function saveConsentPreferences(consent: Omit<CookieConsent, 'timestamp'>): void {
  const consentData: CookieConsent = {
    ...consent,
    necessary: true, // Always true
    timestamp: new Date().toISOString()
  };

  setCookie(CONSENT_COOKIE_NAME, JSON.stringify(consentData), {
    expires: CONSENT_DURATION_DAYS,
    secure: window.location.protocol === 'https:',
    sameSite: 'lax'
  });

  // Trigger custom event for consent change
  window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: consentData }));
}

/**
 * Get cookie consent preferences
 */
export function getConsentPreferences(): CookieConsent | null {
  const consentCookie = getCookie(CONSENT_COOKIE_NAME);
  
  if (!consentCookie) {
    return null;
  }

  try {
    return JSON.parse(consentCookie);
  } catch {
    return null;
  }
}

/**
 * Check if a specific cookie category is consented
 */
export function hasConsent(category: keyof CookieConsent): boolean {
  const consent = getConsentPreferences();
  
  if (!consent) {
    return category === 'necessary'; // Necessary cookies are always allowed
  }

  return consent[category] === true;
}

/**
 * Clear all cookies except necessary ones
 */
export function clearNonEssentialCookies(): void {
  const essentialCookies = [
    CONSENT_COOKIE_NAME,
    'auth_token', // Authentication token
    'session_id', // Session identifier
    'csrf_token', // CSRF protection
  ];

  const allCookies = getAllCookies();
  
  for (const cookieName in allCookies) {
    if (!essentialCookies.includes(cookieName)) {
      deleteCookie(cookieName);
      // Also try deleting with domain variations
      deleteCookie(cookieName, '/');
      deleteCookie(cookieName, '/', window.location.hostname);
      deleteCookie(cookieName, '/', `.${window.location.hostname}`);
    }
  }
}

/**
 * Accept all cookies
 */
export function acceptAllCookies(): void {
  saveConsentPreferences({
    necessary: true,
    functional: true,
    analytics: true,
    marketing: true
  });
}

/**
 * Reject all non-essential cookies
 */
export function rejectNonEssentialCookies(): void {
  saveConsentPreferences({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false
  });
  clearNonEssentialCookies();
}

/**
 * Check if user has made a consent decision
 */
export function hasConsentDecision(): boolean {
  return getConsentPreferences() !== null;
}