import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Environment-specific auth token key to prevent dev/production conflicts
const getAuthTokenKey = () => {
  const hostname = window.location.hostname;
  
  // Development: Check for admin token first, then regular dev token
  if (hostname.includes('janeway.replit.dev') || hostname.includes('localhost')) {
    return localStorage.getItem('authToken_dev_admin') ? 'authToken_dev_admin' : 'authToken_dev';
  }
  
  // Production: Use domain-specific token
  return `authToken_${hostname}`;
};

// Helper function to get the actual auth token value
const getAuthToken = () => {
  const hostname = window.location.hostname;
  
  // Development: Check for admin token first, then regular dev token
  if (hostname.includes('janeway.replit.dev') || hostname.includes('localhost')) {
    return localStorage.getItem('authToken_dev_admin') || localStorage.getItem('authToken_dev');
  }
  
  // Production: Use domain-specific token
  return localStorage.getItem(`authToken_${hostname}`) || localStorage.getItem('authToken_prod');
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle authentication errors with user-friendly messages
    if (res.status === 401) {
      throw new Error("Your session has expired. Please log in again to continue.");
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
  
  // Add JWT token to all API requests
  const token = localStorage.getItem(getAuthTokenKey());
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

  // Add JWT auth token to headers (remove duplicate)
  if (!headers['Authorization']) {
    const authToken = getAuthToken();
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
  });

  // Check for authentication errors and provide user-friendly messages
  if (res.status === 401) {
    throw new Error("Your session has expired. Please log in again to continue.");
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
    
    // Get auth token using our helper function
    const authToken = getAuthToken();
    const headers: HeadersInit = {};
    
    // Add Bearer token if available
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      // Using token authentication
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
    });
    
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    return data;
  };

export const queryClient = new QueryClient({
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

// Make queryClient available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).queryClient = queryClient;
}
