import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  tier: string;
  stripeCustomerId?: string;
  isSubscribed?: boolean;
}

interface AuthState {
  user: User | null;
  firebaseUser: any;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    firebaseUser: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('🔥 Firebase user detected:', firebaseUser.email);
        
        try {
          // Get Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          
          // Exchange Firebase token for our user data
          const response = await fetch('/api/auth/firebase-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });

          if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status}`);
          }

          const data = await response.json();
          console.log('✅ User authenticated:', data.user?.email);

          // Check if user needs payment
          if (data.paymentRequired && data.user?.tier === 'pending_payment' && !data.user?.isAdmin) {
            console.log('💳 Payment required - redirecting to Stripe checkout');
            
            // Redirect to Stripe checkout immediately
            try {
              const stripeResponse = await fetch('/api/stripe/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: data.user.userId,
                  email: data.user.email
                })
              });

              if (stripeResponse.ok) {
                const stripeData = await stripeResponse.json();
                if (stripeData.checkoutUrl || stripeData.url) {
                  console.log('🔄 Redirecting to payment:', stripeData.checkoutUrl || stripeData.url);
                  window.location.href = stripeData.checkoutUrl || stripeData.url;
                  return;
                }
              }
            } catch (stripeError) {
              console.error('❌ Stripe redirect failed:', stripeError);
            }
          }

          // Set authenticated user
          setAuthState({
            user: data.user,
            firebaseUser,
            isLoading: false,
            isAuthenticated: true,
            error: null
          });

        } catch (error) {
          console.error('❌ Authentication error:', error);
          setAuthState({
            user: null,
            firebaseUser: null,
            isLoading: false,
            isAuthenticated: false,
            error: error instanceof Error ? error.message : 'Authentication failed'
          });
        }
      } else {
        // User signed out
        setAuthState({
          user: null,
          firebaseUser: null,
          isLoading: false,
          isAuthenticated: false,
          error: null
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      console.log('🔄 Starting Google sign-in...');
      await signInWithPopup(auth, provider);
      // Auth state change will be handled by the useEffect above
    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      setAuthState(prev => ({ ...prev, error: 'Google sign-in failed' }));
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('🔄 Starting email sign-in...');
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state change will be handled by the useEffect above
    } catch (error: any) {
      console.error('❌ Email sign-in failed:', error);
      setAuthState(prev => ({ ...prev, error: error.message || 'Email sign-in failed' }));
      throw error; // Re-throw to allow component to handle specific errors
    }
  };

  const signUpWithEmail = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      console.log('🔄 Starting email sign-up...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user in our database
      const idToken = await userCredential.user.getIdToken();
      const response = await fetch('/api/auth/firebase-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, firstName, lastName })
      });

      if (!response.ok) {
        throw new Error('Failed to create user account');
      }

      // Auth state change will be handled by the useEffect above
    } catch (error) {
      console.error('❌ Email sign-up failed:', error);
      setAuthState(prev => ({ ...prev, error: 'Email sign-up failed' }));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear any cached data
      localStorage.removeItem('musobuddy-theme');
      localStorage.removeItem('musobuddy-custom-color');
      window.location.href = '/';
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  };

  return {
    ...authState,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout
  };
}