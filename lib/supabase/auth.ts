import { supabase, supabaseAdmin, useSupabase } from './client';
import type { AuthTokenResponse, AuthResponse } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

/**
 * Supabase Auth Service
 * Provides authentication functions that can work alongside Firebase Auth
 * during the migration period
 */

// Types that match your current user structure
export interface MusoBuddyUser {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  firebaseUid: string; // We'll keep this for compatibility, but use supabaseUid
  supabaseUid?: string; // New field for Supabase
  isAdmin: boolean;
  tier: string;
  phoneVerified: boolean;
}

export interface AuthState {
  user: MusoBuddyUser | null;
  session: any;
  isLoading: boolean;
  error: string | null;
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  options?: {
    data?: {
      firstName?: string;
      lastName?: string;
    };
  }
): Promise<AuthResponse> {
  if (!useSupabase()) {
    throw new Error('Supabase auth is not enabled');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: options?.data || {},
    },
  });

  return { data, error };
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  if (!useSupabase()) {
    throw new Error('Supabase auth is not enabled');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<{ error: any | null }> {
  if (!useSupabase()) {
    throw new Error('Supabase auth is not enabled');
  }

  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!useSupabase()) {
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  if (!useSupabase()) {
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<{ error: any | null }> {
  if (!useSupabase()) {
    throw new Error('Supabase auth is not enabled');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.VITE_APP_URL || window.location.origin}/reset-password`,
  });

  return { error };
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string): Promise<{ error: any | null }> {
  if (!useSupabase()) {
    throw new Error('Supabase auth is not enabled');
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { error };
}

/**
 * Admin function: Create user with admin privileges
 * Only use server-side with service key
 */
export async function createUserAsAdmin(
  email: string,
  password: string,
  userData: {
    firstName: string;
    lastName: string;
    isAdmin?: boolean;
    tier?: string;
  }
): Promise<{ user: any; error: any }> {
  if (!supabaseAdmin) {
    throw new Error('Admin client not available');
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm for test users
    user_metadata: {
      firstName: userData.firstName,
      lastName: userData.lastName,
      isAdmin: userData.isAdmin || false,
      tier: userData.tier || 'free',
    },
  });

  return { user: data.user, error };
}

/**
 * Convert Supabase user to MusoBuddy user format
 * This bridges the gap between Supabase auth and your existing user structure
 */
export function supabaseUserToMusoBuddyUser(
  supabaseUser: User,
  dbUser?: any
): MusoBuddyUser {
  return {
    id: dbUser?.id || supabaseUser.id,
    email: supabaseUser.email || '',
    emailVerified: supabaseUser.email_confirmed_at !== null,
    firstName: supabaseUser.user_metadata?.firstName || dbUser?.firstName || '',
    lastName: supabaseUser.user_metadata?.lastName || dbUser?.lastName || '',
    firebaseUid: dbUser?.firebaseUid || '', // Keep for compatibility
    supabaseUid: supabaseUser.id,
    isAdmin: supabaseUser.user_metadata?.isAdmin || dbUser?.isAdmin || false,
    tier: supabaseUser.user_metadata?.tier || dbUser?.tier || 'free',
    phoneVerified: dbUser?.phoneVerified || false,
  };
}

/**
 * Set up auth state change listener
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!useSupabase()) {
    return { data: { subscription: null } };
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    console.log(`🔐 [SUPABASE-AUTH] ${event}:`, session?.user?.email);
    callback(session?.user || null);
  });

  return data;
}

/**
 * Verify if current session is valid
 */
export async function verifySession(): Promise<boolean> {
  if (!useSupabase()) {
    return false;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return !error && session !== null;
  } catch {
    return false;
  }
}

/**
 * Get user by ID from your database
 * This will query your users table using Supabase
 */
export async function getUserFromDatabase(supabaseUid: string) {
  if (!useSupabase()) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('supabase_uid', supabaseUid) // Assuming you add this column
    .single();

  if (error) {
    console.error('Error fetching user from database:', error);
    return null;
  }

  return data;
}

/**
 * Health check for Supabase auth
 */
export async function checkAuthHealth(): Promise<{
  connected: boolean;
  hasSession: boolean;
  error?: string;
}> {
  if (!useSupabase()) {
    return { connected: false, hasSession: false, error: 'Supabase not enabled' };
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    return {
      connected: !error,
      hasSession: session !== null,
      error: error?.message,
    };
  } catch (error) {
    return {
      connected: false,
      hasSession: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}