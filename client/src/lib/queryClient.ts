import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from '@/lib/firebase';

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
  
  // Get Firebase ID token for authentication
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${idToken}`;
    } catch (error) {
      console.warn('Failed to get Firebase ID token:', error);
      // Continue without token - let the backend handle the 401
    }
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
    
    // Get Firebase ID token for authentication
    const headers: HeadersInit = {};
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const idToken = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${idToken}`;
      } catch (error) {
        console.warn('Failed to get Firebase ID token for query:', error);
        // Continue without token - let the backend handle the 401
      }
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
