import { useState, useEffect } from 'react';
import { 
  User,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface DatabaseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  isBetaTester: boolean;
  tier: string;
  plan: string;
  created_via_stripe: boolean;
  createdViaStripe: boolean;  // CamelCase version
  trial_status: string;
  trialStatus: string;  // CamelCase version
  isSubscribed: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  onboardingCompleted: boolean;
  hasCompletedPayment: boolean;
  emailPrefix: string | null;
}

interface AuthState {
  user: (User & Partial<DatabaseUser>) | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Wait for auth to be ready before listening to state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Skip the first "no user" state if auth hasn't initialized yet
      if (!authInitialized && !firebaseUser) {
        setAuthInitialized(true);
        // Give Firebase a moment to restore persisted session
        setTimeout(() => {
          if (auth.currentUser) {
            console.log('🔥 CLEAN auth state (restored):', auth.currentUser.email);
          } else {
            console.log('🔥 CLEAN auth state: no user');
            setAuthState({
              user: null,
              isLoading: false,
              isAuthenticated: false,
              error: null
            });
          }
        }, 100);
        return;
      }
      
      setAuthInitialized(true);
      console.log('🔥 CLEAN auth state:', firebaseUser?.email || 'no user');
      
      if (firebaseUser) {
        try {
          // Fetch database user data
          const token = await firebaseUser.getIdToken();
          const response = await fetch('/api/auth/user', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const databaseUser = await response.json();
            console.log('✅ Database user fetched:', { 
              email: databaseUser.email, 
              isAdmin: databaseUser.isAdmin,
              tier: databaseUser.tier,
              plan: databaseUser.plan,
              createdViaStripe: databaseUser.createdViaStripe,
              hasCompletedPayment: databaseUser.hasCompletedPayment,
              fullData: databaseUser  // Log full data to debug
            });
            
            // Merge Firebase user with database user data
            const mergedUser = {
              ...firebaseUser,
              ...databaseUser
            };
            
            setAuthState({
              user: mergedUser,
              isLoading: false,
              isAuthenticated: true,
              error: null
            });
          } else {
            console.warn('⚠️ Failed to fetch database user, using Firebase user only');
            setAuthState({
              user: firebaseUser,
              isLoading: false,
              isAuthenticated: true,
              error: null
            });
          }
        } catch (error) {
          console.error('❌ Error fetching database user:', error);
          setAuthState({
            user: firebaseUser,
            isLoading: false,
            isAuthenticated: true,
            error: null
          });
        }
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null
        });
      }
    });

    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Email signin successful');
    } catch (error: any) {
      console.error('❌ Email signin failed:', error);
      setAuthState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, firstName: string, lastName: string, inviteCode?: string) => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      
      // Step 1: Create Firebase account
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, {
        displayName: `${firstName} ${lastName}`
      });
      console.log('✅ Firebase signup successful');
      
      // Step 2: Send email verification
      await sendEmailVerification(credential.user);
      console.log('✅ Email verification sent');
      
      // Step 3: Create user in database
      const idToken = await credential.user.getIdToken();
      const response = await fetch('/api/auth/firebase-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, firstName, lastName, inviteCode })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Database creation failed');
      }
      
      const data = await response.json();
      console.log('✅ User created in database:', data.user);
      
      return { ...data, needsVerification: true }; // Flag that verification is needed
      
    } catch (error: any) {
      console.error('❌ Email signup failed:', error);
      setAuthState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      console.log('✅ Google signin successful');
    } catch (error: any) {
      console.error('❌ Google signin failed:', error);
      setAuthState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      console.log('✅ Logout successful');
    } catch (error: any) {
      console.error('❌ Logout failed:', error);
    }
  };

  const refreshUserData = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken(true); // Force refresh token
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const databaseUser = await response.json();
          console.log('🔄 User data refreshed:', databaseUser);
          
          const mergedUser = {
            ...currentUser,
            ...databaseUser
          };
          
          setAuthState({
            user: mergedUser,
            isLoading: false,
            isAuthenticated: true,
            error: null
          });
        }
      }
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
        console.log('✅ Verification email resent');
        return true;
      }
      throw new Error('No user logged in');
    } catch (error: any) {
      console.error('❌ Failed to resend verification email:', error);
      throw error;
    }
  };

  return {
    ...authState,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout,
    refreshUserData,
    resendVerificationEmail
  };
}