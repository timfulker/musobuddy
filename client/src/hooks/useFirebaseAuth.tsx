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
          console.log('🔥 Firebase user detected:', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName
          });

          // Get Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          console.log('🎫 Got Firebase ID token, length:', idToken.length);

          // Verify user exists in our database and check subscription
          console.log('🔄 Verifying user in database...');
          const response = await fetch('/api/auth/firebase-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              idToken: idToken
            })
          });

          console.log('🌐 User verification response:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.log('❌ User verification failed with data:', errorData);
            throw new Error(`User verification failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          console.log('📦 Firebase login response data:', data);
          
          // Check if payment is required
          if (data.paymentRequired && !data.user?.isAdmin) {
            console.log('💳 Payment required for user:', {
              email: data.user?.email,
              userId: data.user?.userId,
              hasUserId: !!data.user?.userId
            });
            
            // Redirect to Stripe checkout for payment
            try {
              const stripeResponse = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  userId: data.user?.userId,
                  email: data.user?.email
                }),
              });

              if (stripeResponse.ok) {
                const stripeData = await stripeResponse.json();
                console.log('✅ Stripe checkout created:', stripeData);
                if (stripeData.url || stripeData.checkoutUrl) {
                  window.location.href = stripeData.url || stripeData.checkoutUrl;
                  return;
                } else {
                  console.error('❌ No checkout URL in response:', stripeData);
                }
              } else {
                const errorData = await stripeResponse.json();
                console.error('❌ Stripe checkout failed:', stripeResponse.status, errorData);
              }
            } catch (stripeError) {
              console.error('❌ Failed to create Stripe checkout:', stripeError);
            }
            
            // Fallback: redirect to pricing page instead of signup
            console.log('⚠️ Redirecting to pricing page as fallback');
            window.location.href = '/pricing';
            return;
          }
          
          console.log('✅ Firebase login successful, user verified');
          
          // Invalidate auth queries to refresh user data
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          
          // Redirect to dashboard if on auth pages
          if (window.location.pathname.startsWith('/auth') || 
              window.location.pathname === '/login' || 
              window.location.pathname === '/signup') {
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 500);
          }
        } catch (err) {
          console.error('❌ Firebase token exchange failed:', err);
          setError(err instanceof Error ? err.message : 'Authentication failed');
        }
      } else {
        // User signed out - clear all data
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
      localStorage.removeItem('musobuddy-theme');
      localStorage.removeItem('musobuddy-custom-color');
      queryClient.clear();
      window.location.href = '/';
    } catch (err) {
      console.error('❌ Logout failed:', err);
      // Force cleanup even if logout fails
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