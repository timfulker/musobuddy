import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signInWithGoogle, signOutUser } from '@shared/firebase';
import { useQueryClient } from '@tanstack/react-query';

export function useFirebaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      console.log('🔥 Firebase auth state changed:', !!firebaseUser);
      setUser(firebaseUser);
      setLoading(false);

      if (firebaseUser) {
        try {
          // Get Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          console.log('🎫 Got Firebase ID token');

          // Exchange Firebase token for our app's JWT
          const response = await fetch('/api/auth/firebase-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idToken: idToken
            })
          });

          if (!response.ok) {
            // Handle payment requirement
            if (response.status === 403) {
              const errorData = await response.json();
              if (errorData.requiresPayment) {
                // Redirect to Stripe checkout for payment
                try {
                  const stripeResponse = await fetch('/api/stripe/create-checkout', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      email: errorData.email,
                      userId: errorData.userId,
                      returnUrl: window.location.origin + '/success'
                    }),
                  });

                  if (stripeResponse.ok) {
                    const stripeData = await stripeResponse.json();
                    if (stripeData.url || stripeData.checkoutUrl) {
                      window.location.href = stripeData.url || stripeData.checkoutUrl;
                      return;
                    }
                  }
                } catch (stripeError) {
                  console.error('Failed to create Stripe checkout:', stripeError);
                }
                
                // Fallback: redirect to signup if Stripe fails
                window.location.href = '/signup';
                return;
              }
            }
            throw new Error('Failed to exchange Firebase token');
          }

          const data = await response.json();
          
          // Use centralized token storage
          const { storeAuthToken } = await import('@/utils/authToken');
          storeAuthToken(data.authToken, firebaseUser.email || '');
          console.log('✅ Firebase login successful, JWT stored');
          
          // Invalidate auth queries to refresh user data
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        } catch (err) {
          console.error('❌ Firebase token exchange failed:', err);
          setError(err instanceof Error ? err.message : 'Authentication failed');
        }
      } else {
        // User signed out
        localStorage.removeItem('musobuddy-auth-token');
        queryClient.clear();
      }
    });

    return () => unsubscribe();
  }, [queryClient]);

  const loginWithGoogle = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      console.error('❌ Google login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      localStorage.removeItem('musobuddy-auth-token');
      localStorage.removeItem('musobuddy-theme');
      localStorage.removeItem('musobuddy-custom-color');
      queryClient.clear();
      window.location.href = '/';
    } catch (err) {
      console.error('❌ Logout failed:', err);
      // Force cleanup even if logout fails
      localStorage.removeItem('musobuddy-auth-token');
      localStorage.removeItem('musobuddy-theme');
      localStorage.removeItem('musobuddy-custom-color');
      queryClient.clear();
      window.location.href = '/';
    }
  };

  return {
    user,
    loading,
    error,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user
  };
}