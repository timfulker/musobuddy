import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithRedirect, signInWithPopup, getRedirectResult, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCfwZB9BlkAtih_-IoRIvgLAsAelYq5HR4",
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "musobuddy-601a7"}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "musobuddy-601a7",
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID || "musobuddy-601a7"}.firebasestorage.app`,
  messagingSenderId: "32700359552",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:32700359552:web:13a479dc96ce2fb2afae1d",
};

// Debug: Log Firebase config in development
if (import.meta.env.DEV) {
  console.log('🔥 Firebase Config:', {
    projectId: firebaseConfig.projectId,
    apiKey: firebaseConfig.apiKey?.substring(0, 20) + '...',
    authDomain: firebaseConfig.authDomain
  });
}

// Initialize Firebase only if no apps exist
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = () => {
  // Use popup for better user experience and immediate result
  return signInWithPopup(auth, googleProvider);
};

// For redirect flow (if needed)
export const signInWithGoogleRedirect = () => {
  return signInWithRedirect(auth, googleProvider);
};

// Get redirect result after coming back from redirect
export const getGoogleRedirectResult = () => {
  return getRedirectResult(auth);
};

export const signOutUser = () => {
  return signOut(auth);
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};