import { useState, useEffect } from 'react';
import { 
  User,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthState {
  user: User | null;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔥 CLEAN auth state:', user?.email || 'no user');
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: !!user,
        error: null
      });
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

  const signUpWithEmail = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      
      // Step 1: Create Firebase account
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, {
        displayName: `${firstName} ${lastName}`
      });
      console.log('✅ Firebase signup successful');
      
      // Step 2: Create user in database
      const idToken = await credential.user.getIdToken();
      const response = await fetch('/api/auth/firebase-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, firstName, lastName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Database creation failed');
      }
      
      const data = await response.json();
      console.log('✅ User created in database:', data.user);
      
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

  return {
    ...authState,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    logout
  };
}