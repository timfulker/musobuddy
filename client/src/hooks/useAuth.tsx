import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User as SupabaseUser, AuthError, Session } from '@supabase/supabase-js';

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

// Compatibility interface to match Firebase useAuth
interface CompatibleUser extends Partial<DatabaseUser> {
  uid: string; // Supabase user.id
  email: string;
  emailVerified: boolean; // from Supabase user.email_confirmed_at
  displayName?: string; // Constructed from firstName + lastName
}

interface AuthState {
  user: CompatibleUser | null;
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 [SUPABASE-AUTH] Initial session check:', session ? 'Found session' : 'No session');
      setAuthInitialized(true);
      handleAuthChange(session);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 [SUPABASE-AUTH] Auth state changed:', event, session ? 'with session' : 'no session');
      handleAuthChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = async (session: Session | null) => {
    if (!authInitialized) {
      setAuthInitialized(true);
    }

    if (session?.user) {
      // SECURITY: Check if this is a recovery session that requires password reset
      const isRecoverySession = sessionStorage.getItem('password_reset_required') === 'true' ||
                              sessionStorage.getItem('recovery_session_active') === 'true';
      
      if (isRecoverySession) {
        console.log('🛡️ [SUPABASE-AUTH] RECOVERY SESSION DETECTED - Blocking dashboard access until password reset');
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false, // CRITICAL: Block auth until password reset
          error: 'Password reset required. Please complete your password reset to continue.'
        });
        return;
      }

      try {
        // Fetch database user data using Supabase token
        const token = session.access_token;
        console.log('🔍 [SUPABASE-AUTH] Fetching user data with token:', token.substring(0, 20) + '...');

        // Use direct fetch to handle 401 responses without throwing
        const response = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const databaseUser = await response.json();
          console.log('✅ [SUPABASE-AUTH] Database user fetched:', { id: databaseUser.id, email: databaseUser.email });

          // Create compatible user object
          const compatibleUser: CompatibleUser = {
            uid: session.user.id,
            email: session.user.email || '',
            emailVerified: !!session.user.email_confirmed_at,
            displayName: databaseUser.firstName && databaseUser.lastName
              ? `${databaseUser.firstName} ${databaseUser.lastName}`
              : undefined,
            ...databaseUser
          };

          setAuthState({
            user: compatibleUser,
            isLoading: false,
            isAuthenticated: true,
            error: null
          });
        } else {
          console.warn('⚠️ [SUPABASE-AUTH] Database user not found, will retry');
          
          // Don't sign out! User is authenticated with Supabase
          // Just use the Supabase user data temporarily
          const compatibleUser: CompatibleUser = {
            uid: session.user.id,
            email: session.user.email || '',
            emailVerified: !!session.user.email_confirmed_at,
            displayName: session.user.user_metadata?.full_name
          };

          setAuthState({
            user: compatibleUser,
            isLoading: false,
            isAuthenticated: true, // Keep authenticated!
            error: 'Limited access - database sync pending'
          });
        }
      } catch (error: any) {
        console.error('❌ [SUPABASE-AUTH] Error fetching user data:', error);
        
        // Don't sign out on network errors!
        const compatibleUser: CompatibleUser = {
          uid: session.user.id,
          email: session.user.email || '',
          emailVerified: !!session.user.email_confirmed_at
        };

        setAuthState({
          user: compatibleUser,
          isLoading: false,
          isAuthenticated: true, // Stay authenticated
          error: 'Database connection issue - using cached data'
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
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      console.log('🔐 [SUPABASE-AUTH] Attempting email signin for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ [SUPABASE-AUTH] Signin failed:', error.message);
        setAuthState(prev => ({ ...prev, error: error.message }));
        throw error;
      }

      console.log('✅ [SUPABASE-AUTH] Email signin successful');
      return data;
    } catch (error: any) {
      console.error('❌ [SUPABASE-AUTH] Signin error:', error);
      setAuthState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, firstName: string, lastName: string, inviteCode?: string) => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      console.log('🔐 [SUPABASE-AUTH] Attempting email signup for:', email);

      // Step 1: Create Supabase user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`
          }
        }
      });

      if (error) {
        console.error('❌ [SUPABASE-AUTH] Signup failed:', error.message);
        setAuthState(prev => ({ ...prev, error: error.message }));
        throw error;
      }

      console.log('✅ [SUPABASE-AUTH] Supabase signup successful');

      // Step 2: Create user in database (if Supabase user was created)
      if (data.user && data.session) {
        try {
          const response = await fetch('/api/auth/supabase-signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`
            },
            body: JSON.stringify({
              supabaseUid: data.user.id,
              email: data.user.email,
              firstName,
              lastName,
              inviteCode
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.warn('⚠️ [SUPABASE-AUTH] Database creation failed:', errorData);
            // Don't throw error - user was created in Supabase successfully
          } else {
            const userData = await response.json();
            console.log('✅ [SUPABASE-AUTH] User created in database:', userData.user);
          }
        } catch (dbError) {
          console.warn('⚠️ [SUPABASE-AUTH] Database creation error:', dbError);
          // Don't throw - user exists in Supabase
        }
      }

      return {
        ...data,
        needsVerification: !data.user?.email_confirmed_at
      };

    } catch (error: any) {
      console.error('❌ [SUPABASE-AUTH] Signup error:', error);
      setAuthState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  };

  const signInWithGoogle = async (inviteCode?: string) => {
    try {
      setAuthState(prev => ({ ...prev, error: null }));
      console.log('🔐 [SUPABASE-AUTH] Attempting Google signin');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: inviteCode ? { inviteCode } : undefined
        }
      });

      if (error) {
        console.error('❌ [SUPABASE-AUTH] Google signin failed:', error.message);
        setAuthState(prev => ({ ...prev, error: error.message }));
        throw error;
      }

      console.log('✅ [SUPABASE-AUTH] Google signin initiated');
      return data;
    } catch (error: any) {
      console.error('❌ [SUPABASE-AUTH] Google signin error:', error);
      setAuthState(prev => ({ ...prev, error: error.message }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔐 [SUPABASE-AUTH] Signing out');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('❌ [SUPABASE-AUTH] Logout failed:', error.message);
        throw error;
      }

      console.log('✅ [SUPABASE-AUTH] Logout successful');
    } catch (error: any) {
      console.error('❌ [SUPABASE-AUTH] Logout error:', error);
    }
  };

  const refreshUserData = async () => {
    try {
      console.log('🔄 [SUPABASE-AUTH] Refreshing user data');
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        await handleAuthChange(session);
        console.log('✅ [SUPABASE-AUTH] User data refreshed');
      }
    } catch (error) {
      console.error('❌ [SUPABASE-AUTH] Failed to refresh user data:', error);
    }
  };

  const resendVerificationEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No user logged in');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email!
      });

      if (error) {
        console.error('❌ [SUPABASE-AUTH] Failed to resend verification email:', error.message);
        throw error;
      }

      console.log('✅ [SUPABASE-AUTH] Verification email resent');
      return true;
    } catch (error: any) {
      console.error('❌ [SUPABASE-AUTH] Resend verification error:', error);
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