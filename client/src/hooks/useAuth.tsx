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
  isAssigned: boolean;
  trialEndsAt: Date | string | null;
  hasPaid: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  onboardingCompleted: boolean;
  emailPrefix: string | null;
  createdByAdmin: boolean;
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
            // Auth state restored
          } else {
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

  const signInWithGoogle = async (inviteCode?: string) => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Google signin successful');
      
      // Check if this is a new user by trying to fetch database record
      const token = await result.user.getIdToken();
      const userResponse = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // If user doesn't exist in database (404), create them
      if (userResponse.status === 404) {
        console.log('🆕 New Google user detected, creating database record...');
        
        // Extract name from Google profile
        const displayName = result.user.displayName || '';
        const nameParts = displayName.split(' ');
        const firstName = nameParts[0] || 'Google';
        const lastName = nameParts.slice(1).join(' ') || 'User';
        
        // Include invite code if provided (for beta users)
        const signupData: any = { 
          idToken: token, 
          firstName, 
          lastName 
        };
        
        if (inviteCode) {
          signupData.inviteCode = inviteCode;
          console.log('🎟️ Including beta invite code:', inviteCode);
        }
        
        const signupResponse = await fetch('/api/auth/firebase-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupData)
        });
        
        if (!signupResponse.ok) {
          const errorData = await signupResponse.json();
          console.error('❌ Failed to create database user:', errorData);
          // Don't throw error - let them proceed with Firebase-only data
        } else {
          console.log('✅ Database record created for Google user');
        }
      }
      
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
        // CRITICAL: First reload the Firebase user to get updated email verification status
        await currentUser.reload();
        console.log('🔄 Firebase user reloaded, emailVerified:', currentUser.emailVerified);
        
        // Then get a fresh token with the updated claims
        const token = await currentUser.getIdToken(true); // Force refresh token
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const databaseUser = await response.json();
          console.log('🔄 User data refreshed:', databaseUser);
          console.log('💰 hasPaid status from database:', databaseUser.hasPaid);
          
          const mergedUser = {
            ...currentUser,
            ...databaseUser
          };
          console.log('🔀 Merged user hasPaid:', mergedUser.hasPaid);
          
          setAuthState({
            user: mergedUser,
            isLoading: false,
            isAuthenticated: true,
            error: null
          });
        } else {
          console.log('⚠️ Failed to fetch database user, using Firebase user only');
          // If database call fails but Firebase user is valid, use Firebase data
          setAuthState({
            user: currentUser,
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