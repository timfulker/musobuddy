import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from '@/lib/supabase';

// Forward declare queryClient to avoid circular dependency
let queryClient: QueryClient;

// Token cache with 55 minute expiry (Supabase tokens expire after 1 hour)
let tokenCache: { token: string; expiry: number } | null = null;

async function getAccessToken(forceRefresh = false): Promise<string | null> {
  try {
    // Check if we have a valid cached token
    if (!forceRefresh && tokenCache && tokenCache.expiry > Date.now()) {
      return tokenCache.token;
    }

    // Get current session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Failed to get Supabase session:', error.message);
      return null;
    }
    
    if (!session?.access_token) {
      console.log('No valid Supabase session found');
      return null;
    }

    // Refresh token if needed and requested
    if (forceRefresh) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Failed to refresh Supabase session:', refreshError.message);
        return session.access_token; // Return original token if refresh fails
      }
      if (refreshData.session?.access_token) {
        // Cache the refreshed token for 55 minutes
        tokenCache = {
          token: refreshData.session.access_token,
          expiry: Date.now() + 55 * 60 * 1000
        };
        return refreshData.session.access_token;
      }
    }

    // Cache the token for 55 minutes
    tokenCache = {
      token: session.access_token,
      expiry: Date.now() + 55 * 60 * 1000
    };
    
    return session.access_token;
  } catch (error) {
    console.warn('Failed to get Supabase access token:', error);
    return null;
  }
}

// Clear token cache on auth state change
supabase.auth.onAuthStateChange(() => {
  tokenCache = null;
});

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle authentication errors with user-friendly messages
    if (res.status === 401) {
      // Sign out and stop all queries to prevent infinite loops
      console.log('🚪 [AUTH] 401 detected, signing out and cancelling queries');
      await supabase.auth.signOut();
      queryClient.cancelQueries();
      tokenCache = null;
      throw new Error("UNAUTHORIZED");
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  const method = options?.method || 'GET';
  let body = options?.body;
  const headers = options?.headers || {};
  
  // Get Supabase access token for authentication (now cached)
  let accessToken = await getAccessToken();
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  if (body) {
    if (body instanceof FormData) {
      // Don't set Content-Type for FormData - let browser set it with boundary
      // FormData should be sent as-is
    } else if (typeof body === 'object') {
      body = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    } else if (typeof body === 'string') {
      headers['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  // If we get a 401, try once more with a fresh token
  if (res.status === 401) {
    accessToken = await getAccessToken(true); // Force refresh
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      const retryRes = await fetch(url, {
        method,
        headers,
        body,
      });
      
      if (retryRes.status === 401) {
        // Sign out and stop all queries to prevent infinite loops
        console.log('🚪 [AUTH] 401 after retry, signing out and cancelling queries');
        await supabase.auth.signOut();
        queryClient.cancelQueries();
        tokenCache = null;
        throw new Error("UNAUTHORIZED");
      }
      
      await throwIfResNotOk(retryRes);
      return retryRes;
    }
  }

  // Check for authentication errors and provide user-friendly messages
  if (res.status === 401) {
    // Sign out and stop all queries to prevent infinite loops
    console.log('🚪 [AUTH] 401 in apiRequest, signing out and cancelling queries');
    await supabase.auth.signOut();
    queryClient.cancelQueries();
    tokenCache = null;
    throw new Error("UNAUTHORIZED");
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Query request to: ${queryKey[0]}
    
    // Get Supabase access token for authentication (now cached)
    const headers: HeadersInit = {};
    let accessToken = await getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    let res = await fetch(queryKey[0] as string, {
      headers,
    });
    
    // If we get a 401, try once more with a fresh token
    if (res.status === 401) {
      accessToken = await getAccessToken(true); // Force refresh
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        res = await fetch(queryKey[0] as string, {
          headers,
        });
      }
    }
    
    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") {
        // Sign out and stop all queries to prevent infinite loops
        console.log('🚪 [AUTH] 401 in queryFn, signing out and cancelling queries');
        await supabase.auth.signOut();
        queryClient.cancelQueries();
        tokenCache = null;
        return null;
      }
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    return data;
  };

queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes cache
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export { queryClient };

// Make queryClient available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).queryClient = queryClient;
}
